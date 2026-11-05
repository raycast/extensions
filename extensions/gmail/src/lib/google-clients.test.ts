import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { it } from "node:test";
import { createGmailClient } from "./google-clients";

it("uses native fetch for authenticated Gmail requests, including API errors", async (t) => {
  const nativeFetch = globalThis.fetch;
  const fetchMock = t.mock.method(globalThis, "fetch", (...args: Parameters<typeof fetch>) => nativeFetch(...args));
  const requests: { path: string; method?: string; authorization?: string; body: string }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk.toString();
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    requests.push({ path, method: request.method, authorization: request.headers.authorization, body });
    response.setHeader("content-type", "application/json");
    if (path.endsWith("/missing")) {
      response.writeHead(404);
      response.end(JSON.stringify({ error: { message: "Message not found" } }));
    } else if (path.endsWith("/modify")) {
      response.end(JSON.stringify({ id: "test-message" }));
    } else {
      response.end(JSON.stringify({ emailAddress: "test@example.com" }));
    }
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const options = { rootUrl: `http://127.0.0.1:${address.port}/`, retry: false };
  const gmail = createGmailClient("test-client-id", { accessToken: "test-access-token" });

  const profile = await gmail.users.getProfile({ userId: "me" }, options);
  assert.equal(profile.data.emailAddress, "test@example.com");

  const requestBody = { removeLabelIds: ["UNREAD"] };
  const modified = await gmail.users.messages.modify({ userId: "me", id: "test-message", requestBody }, options);
  assert.equal(modified.data.id, "test-message");
  assert.deepEqual(JSON.parse(requests.find((request) => request.method === "POST")?.body ?? ""), requestBody);
  await assert.rejects(gmail.users.messages.get({ userId: "me", id: "missing" }, options), /Message not found/);

  assert.equal(fetchMock.mock.callCount(), 3);
  assert.ok(requests.every((request) => request.authorization === "Bearer test-access-token"));
  assert.deepEqual(
    requests.map((request) => request.path),
    [
      "/gmail/v1/users/me/profile",
      "/gmail/v1/users/me/messages/test-message/modify",
      "/gmail/v1/users/me/messages/missing",
    ],
  );
});
