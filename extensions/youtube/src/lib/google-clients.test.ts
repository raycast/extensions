import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { it } from "node:test";
import { createYoutubeClient } from "./google-clients";

it("uses native fetch for API-key YouTube requests, including API errors", async (t) => {
  const nativeFetch = globalThis.fetch;
  const fetchMock = t.mock.method(globalThis, "fetch", (...args: Parameters<typeof fetch>) => nativeFetch(...args));
  const requests: { path: string; key: string | null }[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push({ path: url.pathname, key: url.searchParams.get("key") });
    response.setHeader("content-type", "application/json");
    if (url.searchParams.get("id") === "missing") {
      response.writeHead(403);
      response.end(JSON.stringify({ error: { message: "Quota exceeded" } }));
    } else {
      response.end(JSON.stringify({ items: [{ id: "test-channel" }] }));
    }
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const options = { rootUrl: `http://127.0.0.1:${address.port}/`, retry: false };
  const client = createYoutubeClient("test-api-key");

  const channels = await client.channels.list({ id: ["test-channel"], part: ["snippet"] }, options);
  assert.equal(channels.data.items?.[0].id, "test-channel");
  await assert.rejects(client.channels.list({ id: ["missing"], part: ["snippet"] }, options), /Quota exceeded/);

  assert.equal(fetchMock.mock.callCount(), 2);
  assert.deepEqual(requests, [
    { path: "/youtube/v3/channels", key: "test-api-key" },
    { path: "/youtube/v3/channels", key: "test-api-key" },
  ]);
});
