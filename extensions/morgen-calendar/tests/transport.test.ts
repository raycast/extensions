import assert from "node:assert/strict";
import test from "node:test";
import { MorgenError, sendMorgenRequest } from "../src/lib/transport";

test("sends the documented API key scheme and JSON body", async () => {
  let capturedUrl = "";
  let capturedOptions: RequestInit | undefined;
  const fetcher = async (url: string | URL | Request, options?: RequestInit) => {
    capturedUrl = String(url);
    capturedOptions = options;
    return Response.json({ data: { id: "new-task" } });
  };
  const result = await sendMorgenRequest<{ data: { id: string } }>(
    "/tasks/create",
    "test-key",
    { method: "POST", body: { title: "Test task" } },
    fetcher as typeof fetch,
  );
  assert.equal(capturedUrl, "https://api.morgen.so/v3/tasks/create");
  assert.equal(new Headers(capturedOptions?.headers).get("Authorization"), "ApiKey test-key");
  assert.equal(new Headers(capturedOptions?.headers).get("Content-Type"), "application/json");
  assert.equal(capturedOptions?.body, JSON.stringify({ title: "Test task" }));
  assert.equal(result.data.id, "new-task");
});

test("handles Morgen's empty 204 responses", async () => {
  const result = await sendMorgenRequest<void>(
    "/tasks/close",
    "test-key",
    { method: "POST", body: { id: "task" } },
    (async () => new Response(null, { status: 204 })) as typeof fetch,
  );
  assert.equal(result, undefined);
});

test("explains entitlement and rate-limit failures", async () => {
  await assert.rejects(
    sendMorgenRequest("/tasks/list?limit=100", "test-key", {}, (async () => new Response(null, { status: 403 })) as typeof fetch),
    (error: unknown) => error instanceof MorgenError && error.status === 403 && /API access/.test(error.message),
  );
  await assert.rejects(
    sendMorgenRequest("/tasks/list?limit=100", "test-key", {}, (async () => new Response(null, { status: 429, headers: { "Retry-After": "42" } })) as typeof fetch),
    (error: unknown) => error instanceof MorgenError && error.status === 429 && /42 seconds/.test(error.message),
  );
});
