import test from 'node:test';
import assert from 'node:assert/strict';
import { taskQuery } from '../src/task-query.mjs';

test('accepted image and video requests expose read-only query endpoints', () => {
  assert.deepEqual(taskQuery('image', { code: 200, taskId: 'opaque-image', status: 'waiting' }), { endpoint: 'imageWatermarkTaskDetail', taskId: 'opaque-image' });
  assert.deepEqual(taskQuery('video', { code: 200, taskId: '123' }), { endpoint: 'taskDetail', taskId: '123' });
});
test('queries retain supplied ID when response omits it', () => {
  assert.deepEqual(taskQuery('video_query', { code: 200 }, ' 123 '), { endpoint: 'taskDetail', taskId: '123' });
});
test('rejections, share results and invalid IDs never enable task queries', () => {
  for (const result of [{ code: 500, taskId: '123' }, { code: 200 }, { code: 200, taskId: 123 }, { code: 200, taskId: 'x'.repeat(129) }]) assert.equal(taskQuery('image', result), undefined);
  assert.equal(taskQuery('share', { code: 200, taskId: '123' }), undefined);
});
