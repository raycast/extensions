import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestUrl, executeOperation, interpolatePath, parseJsonObject, ReeplApiError } from '../src/api';
import { OPERATION_BY_ID } from '../src/operations';

test('parses JSON objects and rejects malformed or non-object values', () => {
  assert.deepEqual(parseJsonObject('', 'Body'), {});
  assert.deepEqual(parseJsonObject('{"content":"hello"}', 'Body'), { content: 'hello' });
  assert.throws(() => parseJsonObject('{', 'Body'), /Invalid Body JSON/);
  assert.throws(() => parseJsonObject('[]', 'Body'), /Body must be a JSON object/);
});

test('interpolates and encodes path parameters', () => {
  assert.equal(interpolatePath('/drafts/{draftId}', { draftId: 'draft/with spaces' }), '/drafts/draft%2Fwith%20spaces');
  assert.throws(() => interpolatePath('/drafts/{draftId}', {}), /Missing required path param: draftId/);
});

test('builds HTTPS URLs with query parameters and repeated arrays', () => {
  const operation = OPERATION_BY_ID.listPosts;
  const url = createRequestUrl('https://api.reepl.io/v1/', operation, {}, { status: 'scheduled', limit: 5, tag: ['one', 'two'] });

  assert.equal(url.pathname, '/v1/external/posts');
  assert.equal(url.searchParams.get('status'), 'scheduled');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.deepEqual(url.searchParams.getAll('tag'), ['one', 'two']);
  assert.throws(() => createRequestUrl('http://localhost:3000/v1', operation, {}, {}), /HTTPS/);
});

test('executes an operation with API-key auth and parses the response', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const result = await executeOperation({
    operation: OPERATION_BY_ID.createDraft,
    apiKey: 'rpl_live_test',
    body: { content: 'hello' },
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ id: 'draft-1' }), { status: 201 });
    },
  });

  assert.equal(result.status, 201);
  assert.deepEqual(result.data, { id: 'draft-1' });
  assert.equal(requests[0].init?.headers?.['X-API-Key'], 'rpl_live_test');
  assert.equal(requests[0].init?.body, JSON.stringify({ content: 'hello' }));
});

test('exposes API error status and data to the caller', async () => {
  await assert.rejects(
    () => executeOperation({
      operation: OPERATION_BY_ID.getCurrentUser,
      apiKey: 'rpl_live_test',
      fetchImpl: async () => new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof ReeplApiError);
      assert.equal(error.status, 403);
      assert.deepEqual(error.data, { message: 'Forbidden' });
      return true;
    },
  );
});
