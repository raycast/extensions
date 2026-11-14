import test from 'node:test';
import assert from 'node:assert/strict';
import { resultSummary } from '../src/result-summary.mjs';
import { taskQuery } from '../src/task-query.mjs';

test('actual nested image contract retains accepted ID and opens completed query result', () => {
  const accepted = { code: 200, task: { taskId: 'image-123', status: 'waiting' } };
  assert.equal(taskQuery('image', accepted).taskId, 'image-123');
  assert.equal(resultSummary('image', accepted).status, 'waiting');
  const completed = { code: 200, task: { taskId: 'image-123', status: 'success', resultUrl: 'https://example.com/result.png' } };
  assert.equal(resultSummary('image_query', completed).url, completed.task.resultUrl);
});
test('video completed query exposes only resultUrl and preserves fallback ID', () => {
  assert.deepEqual(resultSummary('video_query', { code: 200, status: 'success', resultUrl: 'https://example.com/result.mp4' }, 'video-123'), { status: 'success', taskId: 'video-123', failure: undefined, url: 'https://example.com/result.mp4' });
});
test('unsafe, pending, expired and rejected results never expose actionable links', () => {
  for (const resultUrl of ['javascript:alert(1)', 'https://user:pass@example.com/file', 'https://example.com/file#fragment']) assert.equal(resultSummary('video_query', { code: 200, status: 'success', resultUrl }).url, undefined);
  for (const status of ['waiting', 'processing', 'expired', 'failed']) assert.equal(resultSummary('video_query', { code: 200, status, resultUrl: 'https://example.com/file' }).url, undefined);
  assert.equal(resultSummary('video_query', { code: 500, status: 'success', resultUrl: 'https://example.com/file', message: 'Rejected' }).failure, 'Rejected');
  assert.equal(resultSummary('image_query', { code: 200, task: { status: 'failed', failReason: 'Insufficient credits' } }).failure, 'Insufficient credits');
});
test('share result uses official data.video field; arbitrary URL fields are ignored', () => {
  assert.equal(resultSummary('share', { code: 200, data: { video: 'https://example.com/video.mp4' } }).url, 'https://example.com/video.mp4');
  assert.equal(resultSummary('video_query', { code: 200, status: 'success', originalUrl: 'https://example.com/input', downloadUrl: 'https://example.com/unknown' }).url, undefined);
});
