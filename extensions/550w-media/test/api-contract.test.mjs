import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../src/generated/api.mjs';

test('image upload remains asynchronous and preserves operation ID and account', async () => {
  const file = new File(['image'], 'sample.png');
  const result = await request('removeImageWatermark', { apiKey: 'test-key', userNo: 'test-user' }, { operationId: 'operation-123', sync: 'false' }, file, async (url, options) => {
    assert.equal(url, 'https://www.550wai.cn/open/removeImageWatermark');
    assert.equal(options.body.get('sync'), 'false');
    assert.equal(options.body.get('operationId'), 'operation-123');
    assert.equal(options.body.get('apiKey'), 'test-key');
    assert.equal(options.body.get('file').name, 'sample.png');
    assert.equal(options.redirect, 'error');
    return Response.json({ code: 200, taskId: 'test-task', status: 'waiting' });
  });
  assert.equal(result.status, 'waiting');
});
test('transport uncertainty never retries a processing request', async () => {
  let calls = 0;
  await assert.rejects(request('submitTask', { apiKey: 'test-key', userNo: 'test-user' }, { idempotencyKey: 'operation-123' }, undefined, async () => { calls++; throw new Error('timeout'); }), /Outcome not confirmed/);
  assert.equal(calls, 1);
});
test('invalid media is rejected before transport', async () => {
  let calls = 0;
  await assert.rejects(request('uploadVideo', { apiKey: 'test-key', userNo: 'test-user' }, {}, new File(['invalid'], 'sample.txt'), async () => { calls++; }), /Invalid file/);
  assert.equal(calls, 0);
});
