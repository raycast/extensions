import assert from "node:assert/strict";
import test from "node:test";
import { HttpCommandClient, normalizeServerUrl } from "../src/services/http-client";

test("normalizes trailing slash and preserves reverse proxy base path", () => {
  assert.equal(normalizeServerUrl(" https://music.example/ma/ "), "https://music.example/ma");
  for (const url of ["ftp://host", "https://user:secret@host", "https://host?token=secret", "https://host/#x"])
    assert.throws(() => normalizeServerUrl(url));
});
test("HTTP request uses bearer auth and returns raw results without WebSocket unwrapping", async () => {
  const mock: typeof fetch = async (url, init) => {
    assert.equal(url, "https://music.example/ma/api");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fake-test-token");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.command, "players/all");
    assert.deepEqual(body.args, {});
    assert.ok(body.message_id);
    return Response.json([{ player_id: "speaker" }]);
  };
  assert.deepEqual(
    await new HttpCommandClient("https://music.example/ma/", "fake-test-token", mock).command("players/all"),
    [{ player_id: "speaker" }],
  );
});
test("auth errors are actionable and server response bodies are not exposed", async () => {
  for (const status of [401, 403, 500]) {
    const client = new HttpCommandClient(
      "http://localhost:8095",
      "fake-test-token",
      async () => new Response("private server diagnostic", { status }),
    );
    await assert.rejects(
      client.command("players/all"),
      (error: Error) => !error.message.includes("private") && !error.message.includes("fake-test-token"),
    );
  }
});
test("network failures never replay a mutation automatically", async () => {
  let calls = 0;
  const client = new HttpCommandClient("http://localhost:8095", "fake-test-token", async () => {
    calls++;
    throw new Error("network");
  });
  await assert.rejects(client.command("player_queues/play_media"), /refresh before retrying/);
  assert.equal(calls, 1);
});
test("invalid JSON fails explicitly", async () => {
  const client = new HttpCommandClient(
    "http://localhost:8095",
    "fake-test-token",
    async () => new Response("<html>Login</html>"),
  );
  await assert.rejects(client.command("players/all"), /invalid response/);
});
