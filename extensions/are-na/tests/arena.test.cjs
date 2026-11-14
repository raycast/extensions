const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relative, overrides = {}, globals = {}) {
  const cache = new Map();
  function read(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true } }).outputText;
    const context = { module, exports: module.exports, URL, URLSearchParams, Error, console, ...globals,
      require(name) {
        if (overrides[name]) return overrides[name];
        if (name === '@raycast/api') return { environment: { raycastVersion: 'test' }, showToast: async () => {}, Toast: { Style: { Failure: 'failure' } }, getPreferenceValues: () => ({ defaultPageSize: '24', defaultSearchSort: 'score_desc' }) };
        return name.startsWith('.') ? read(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
      },
    };
    vm.runInNewContext(source, context, { filename });
    return module.exports;
  }
  return read(path.resolve(__dirname, '..', relative));
}
const plain = (value) => JSON.parse(JSON.stringify(value));
function client(responses) {
  const requests = [];
  const { Arena } = load('src/api/arena.ts', {}, { fetch: async (url, options) => {
    requests.push({ url: String(url), ...options, body: options.body ? JSON.parse(options.body) : undefined });
    const body = responses.shift();
    return { ok: true, status: 200, json: async () => body };
  }});
  return { arena: new Arena(), requests };
}
const meta = { current_page: 1, per_page: 24, total_count: 101, total_pages: 5, next_page: 2, prev_page: null, has_more_pages: true };
const block = { id: 123, type: 'Text', content: { markdown: 'Hello' }, user: { id: 1, slug: 'demo' } };

test('references accept canonical links and reject foreign or injected paths', () => {
  const { arenaReference, channelReferences, pagination } = load('src/utils/references.ts');
  assert.equal(arenaReference('https://www.are.na/demo/my-channel?view=grid', 'channel'), 'my-channel');
  assert.equal(arenaReference('https://www.are.na/block/123', 'block'), '123');
  assert.equal(arenaReference('demo/my-channel', 'channel'), 'my-channel');
  assert.deepEqual(plain(channelReferences(['my-channel', 'https://www.are.na/demo/my-channel'])), ['my-channel']);
  for (const ref of ['https://evil.test/demo/channel', '../me', 'test?foo=bar', 'https://www.are.na/demo/a%2Fb', '']) assert.throws(() => arenaReference(ref, 'channel'));
  for (const ref of ['0', '-1', '9007199254740993']) assert.throws(() => arenaReference(ref, 'block'));
  assert.throws(() => channelReferences([]));
  for (const per of [0, 101, 1.5, NaN]) assert.throws(() => pagination({ per }));
});
test('block editing sends content, whereas creation sends value and channel IDs', async () => {
  const { arena, requests } = client([block, block]);
  await arena.block(123).update({ content: 'Changed' });
  await arena.createBlock({ content: 'https://example.com', channelIds: ['https://www.are.na/demo/notes'] });
  assert.deepEqual(requests[0].body, { content: 'Changed' });
  assert.deepEqual(requests[1].body, { value: 'https://example.com', channel_ids: ['notes'] });
});
test('filtered discovery uses the requested API type and scope', async () => {
  const { arena, requests } = client([{ data: [], meta }]);
  await arena.search('design').all({ type: 'Image', scope: 'my' });
  const url = new URL(requests[0].url);
  assert.equal(url.searchParams.get('type'), 'Image');
  assert.equal(url.searchParams.get('scope'), 'my');
});
test('channel and user pagination preserve continuation even on an empty page', async () => {
  const { arena } = client([{ data: [], meta }, { data: [], meta }, { data: [], meta: {} }]);
  const contents = await arena.channel('notes').contents();
  assert.equal(contents.meta.next_page, 2);
  assert.equal(contents.hasMorePages, true);
  const channels = await arena.user('demo').channelsPage();
  assert.equal(channels.meta.has_more_pages, true);
  assert.equal((await arena.user('demo').channelsPage()).meta.next_page, null);
});
test('nested channels preserve visibility, descriptions and connection IDs', async () => {
  const { arena } = client([{ data: [{ id: 42, type: 'Channel', title: 'Notes', slug: 'notes', visibility: 'closed', description: { plain: 'Research' }, owner: { id: 1, slug: 'demo' }, connection: { id: 99 }, counts: { contents: 7 } }], meta }]);
  const { items } = await arena.channel('parent').contents();
  assert.equal(items[0].class, 'Channel');
  assert.equal(items[0].open, false);
  assert.equal(items[0].description, 'Research');
  assert.equal(items[0].connection.id, 99);
});
test('channel contents tool exposes next page and uses position sort independently of search preference', async () => {
  let params;
  const tool = load('src/tools/get-channel-contents.ts', { './arenaAuth': { getAuthenticatedArena: async () => ({ channel: () => ({ contents: async (input) => { params = input; return { items: [], meta }; } }) }) } }).default;
  const result = await tool({ identifier: 'notes' });
  assert.equal(result.has_more, true);
  assert.equal(result.next_page, 2);
  assert.equal(params.sort, 'position_asc');
});
test('connect-content resolves channel IDs and returns cloneable fields only after one write', async () => {
  let writes = 0;
  const tool = load('src/tools/connect-content.ts', { './arenaAuth': { getAuthenticatedArena: async () => ({ channel: () => ({ get: async () => ({ id: 42 }) }), connection: () => ({ create: async (body) => { writes++; assert.equal(body.connectable_id, 42); return { dangerous: () => {} }; } }) }) } }).default;
  const result = await tool({ identifier: 'notes', type: 'Channel', channelIds: ['target'] });
  assert.equal(writes, 1);
  assert.equal(result.connected, true);
  assert.doesNotThrow(() => structuredClone(result));
});
test('write failures are surfaced without retry and no-op updates do not authenticate', async () => {
  let writes = 0;
  const tool = load('src/tools/create-block.ts', { './arenaAuth': { getAuthenticatedArena: async () => ({ createBlock: async () => { writes++; throw new Error('Timed out'); } }) } }).default;
  assert.equal((await tool({ content: 'Note', channelIds: ['notes'] })).error, 'Timed out');
  assert.equal(writes, 1);
  const update = load('src/tools/update-block.ts', { './arenaAuth': { getAuthenticatedArena: async () => { throw new Error('Should not authenticate'); } } }).default;
  assert.match((await update({ blockId: '123' })).error, /at least one field/);
});
test('digest labels partial coverage and counts only sampled types', async () => {
  const { arena } = client([
    { id: 42, title: 'Notes', slug: 'notes', counts: { contents: 101 }, owner: { id: 1, slug: 'demo' } },
    { data: [block], meta },
  ]);
  const tool = load('src/tools/channel-digest.ts', { './arenaAuth': { getAuthenticatedArena: async () => arena } }).default;
  const result = await tool({ identifier: 'notes', sampleSize: 1 });
  assert.equal(result.is_sample, true);
  assert.equal(result.sampled_count, 1);
  assert.deepEqual(plain(result.sample_type_counts), { Text: 1 });
  assert.equal(result.next_page, 2);
  assert.doesNotThrow(() => structuredClone(result));
});
test('text icons emit raw SVG data URIs so Raycast can paint the preview', () => {
  const { textIcon } = load('src/utils/icons.ts', {
    '@raycast/api': {
      Color: { Green: 'green', Red: 'red', SecondaryText: 'secondary' },
      Icon: { Eye: 'eye', EyeDisabled: 'eye-disabled', Person: 'person', Paragraph: 'paragraph', Clock: 'clock' },
      Image: { Mask: { Circle: 'circle' } },
    },
  });
  const icon = textIcon('Simple esm.sh apps');
  assert.match(icon.source.dark, /^data:image\/svg\+xml,<svg/);
  assert.match(icon.source.dark, /Simple esm\.sh apps/);
  assert.doesNotMatch(icon.source.dark, /clipPath|clip-path|%3Csvg/);
  assert.match(icon.source.light, /#f5f4f0/);
});
test('remove-connection deletes a placement, not its block', async () => {
  const { arena, requests } = client([{}]);
  const tool = load('src/tools/remove-connection.ts', { './arenaAuth': { getAuthenticatedArena: async () => arena } }).default;
  assert.equal((await tool({ connectionId: '999' })).removed, true);
  assert.equal(new URL(requests[0].url).pathname, '/v3/connections/999');
  assert.equal(requests[0].method, 'DELETE');
});
