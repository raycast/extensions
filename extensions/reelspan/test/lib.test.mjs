// Tests the shared logic (no Raycast, no network): drafts, posting through a stand-in API, and result summaries.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { problems, publish, results, summary, profiles, Reelspan } from './.build/reelspan.mjs';

const seen = [];
let server, c;
before(async () => {
  server = createServer(async (req, res) => {
    const chunks = [];
    for await (const x of req) chunks.push(x);
    seen.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('latin1') });
    const reply = (s, j) => res.writeHead(s, { 'content-type': 'application/json' }).end(JSON.stringify(j));
    const path = req.url.split('?')[0];
    if (path === '/v1/profiles') return reply(200, { profiles: [{ username: 'acme', display_name: 'Acme', social_accounts: { x: { a: 1 }, tiktok: '' } }] });
    if (path === '/v1/posts/text') return reply(202, { success: true, request_id: 'req_1' });
    if (path === '/v1/posts/status') return reply(200, { status: 'completed', results: [{ platform: 'x', success: true, url: 'https://x.com/1' }, { platform: 'bluesky', success: false, error: 'Too long' }] });
    if (path === '/v1/posts/video') return reply(202, { success: true, job_id: 'job_1', scheduled_date: '2026-12-01T09:00:00Z' });
    reply(404, {});
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  c = new Reelspan({ apiKey: 'rs_rc', baseUrl: `http://127.0.0.1:${server.address().port}` });
});
after(() => server.close());

test('drafts are checked in plain words', () => {
  assert.deepEqual(problems({ profile: '', type: 'text', platforms: [], text: ' ' }), ['Choose a profile.', 'Choose at least one network.', 'Write the text.']);
  assert.deepEqual(problems({ profile: 'a', type: 'video', platforms: ['x'], media: ['a.mp4', 'b.mp4'] }), ['Only one video per post.']);
  assert.deepEqual(problems({ profile: 'a', type: 'photos', platforms: ['x'] }), ['Add at least one photo.']);
});

test('text post waits and summarises', async () => {
  const r = await publish(c, { profile: 'acme', type: 'text', platforms: ['x', 'bluesky'], text: 'Hi' });
  assert.equal(summary(r), 'Posted to X · failed on Bluesky');
  assert.deepEqual(results(r).map((x) => x.ok), [true, false]);
});

test('a scheduled video from a local file sends the timezone', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rc-'));
  writeFileSync(join(dir, 'a.mp4'), 'VID');
  const r = await publish(c, { profile: 'acme', type: 'video', platforms: ['tiktok'], media: [join(dir, 'a.mp4')], scheduledDate: new Date('2026-12-01T09:00:00Z'), timezone: 'Europe/Berlin' });
  assert.match(summary(r), /^Scheduled for /);
  const body = seen.findLast((s) => s.url === '/v1/posts/video').body;
  assert.match(body, /filename="a.mp4"/);
  assert.match(body, /name="timezone"\r\n\r\nEurope\/Berlin/);
});

test('profiles list connected networks only', async () => {
  assert.deepEqual(await profiles(c), [{ username: 'acme', name: 'Acme', networks: ['x'] }]);
});
