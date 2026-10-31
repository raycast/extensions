import test from 'node:test';
import assert from 'node:assert/strict';
import { videoRegion } from '../src/video-region.mjs';
import { request } from '../src/generated/api.mjs';

test('empty region explicitly sends four zero coordinates in multipart submission', async () => {
  for (const value of [undefined, '', '   ']) {
    const region = videoRegion(value, 1920, 1080);
    assert.deepEqual(region, { x1: 0, y1: 0, x2: 0, y2: 0 });
    await request('submitTask', { apiKey: 'test-key', userNo: 'test-user' }, { ...region, idempotencyKey: 'operation-123' }, undefined, async (_url, options) => {
      for (const key of ['x1', 'y1', 'x2', 'y2']) assert.equal(options.body.get(key), '0');
      return Response.json({ code: 200, taskId: 'video-123', status: 'waiting' });
    });
  }
});
test('advanced region overrides defaults and remains bounded by real metadata', () => {
  assert.deepEqual(videoRegion('[10,20,100,200]', 1920, 1080), { x1: 10, y1: 20, x2: 100, y2: 200 });
  for (const value of ['[0,0,2000,100]', '[0,0,0,0]', 'invalid', '[0,0,1.5,100]']) assert.throws(() => videoRegion(value, 1920, 1080));
});
