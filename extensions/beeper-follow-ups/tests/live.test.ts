import { test } from "node:test";
import assert from "node:assert/strict";

test("running local Beeper API advertises supported search/read/focus endpoints", async () => {
  const response = await fetch("http://localhost:23373/v1/info", {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200);
  const info = (await response.json()) as {
    app: { name: string; version: string };
    server: { remote_access: boolean; hostname: string };
  };
  assert.equal(info.app.name, "Beeper");
  assert.equal(info.server.remote_access, false);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(info.server.hostname));
  const spec = (await (
    await fetch("http://localhost:23373/v1/spec", {
      signal: AbortSignal.timeout(5000),
    })
  ).json()) as { paths: Record<string, Record<string, unknown>> };
  for (const [path, method] of [
    ["/v1/chats/search", "get"],
    ["/v1/chats/{chatID}", "get"],
    ["/v1/chats/{chatID}/messages", "get"],
    ["/v1/focus", "post"],
  ])
    assert.ok(spec.paths[path][method]);
});
test("unauthenticated message access is refused", async () => {
  const response = await fetch(
    "http://localhost:23373/v1/chats/search?type=single&limit=1",
    { signal: AbortSignal.timeout(5000) },
  );
  assert.equal(response.status, 401);
});
