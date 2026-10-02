import { afterEach, describe, expect, mock, test } from "bun:test";
import { raycastState } from "./raycast-mock";
const inbox = raycastState.inbox;
const { accountCacheKey, execute, listTools, resumeExecution } = await import("../src/lib/client");
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  inbox.clear();
  raycastState.failWrites = false;
});

describe("Executor HTTP contracts", () => {
  test("cache identity separates servers, keys, and default scopes without exposing the key", () => {
    const original = raycastState.preferences;
    const first = accountCacheKey();
    expect(first).not.toContain(original.apiKey);
    raycastState.preferences = { ...original, apiKey: "different-test-key" };
    expect(accountCacheKey()).not.toBe(first);
    raycastState.preferences = { ...original, baseUrl: "https://different.example" };
    expect(accountCacheKey()).not.toBe(first);
    raycastState.preferences = { ...original, defaultOwner: "org" };
    expect(accountCacheKey()).not.toBe(first);
    raycastState.preferences = original;
  });
  test("tool calls keep server approval policies and do not retry errors", async () => {
    const calls: RequestInit[] = [];
    globalThis.fetch = mock(async (_url: unknown, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response('{"_tag":"InternalError"}', { status: 500 });
    }) as unknown as typeof fetch;
    await expect(execute("return 1")).rejects.toThrow();
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].body))).toEqual({ code: "return 1", autoApprove: null });
  });
  test("tracks only pending references and replaces them when a run pauses again", async () => {
    const pause = (id: string) => ({
      status: "paused",
      text: "Review this call",
      structured: {
        executionId: id,
        interaction: {
          kind: "form",
          address: "demo.user.main.list",
          args: { privateInput: "do not store" },
          requestedSchema: {},
        },
      },
    });
    globalThis.fetch = mock(async () => Response.json(pause("first"))) as unknown as typeof fetch;
    await execute("return test");
    expect(inbox.size).toBe(1);
    const saved = JSON.parse([...inbox.values()][0]);
    expect(Object.keys(saved).sort()).toEqual(["createdAt", "executionId", "title"]);
    expect([...inbox.values()][0]).not.toContain("privateInput");
    globalThis.fetch = mock(async () => Response.json(pause("next"))) as unknown as typeof fetch;
    await resumeExecution("first", "accept");
    expect([...inbox.values()].map((value) => JSON.parse(value).executionId)).toEqual(["next"]);
  });
  test("local inbox failure never hides an execution that already happened", async () => {
    raycastState.failWrites = true;
    const response = {
      status: "paused",
      text: "Review",
      structured: { executionId: "pause", interaction: { kind: "form", requestedSchema: {} } },
    };
    let requests = 0;
    globalThis.fetch = mock(async () => {
      requests++;
      return Response.json(response);
    }) as unknown as typeof fetch;
    expect(await execute("return test")).toEqual(response);
    expect(requests).toBe(1);
  });
  test("connection scope survives request serialization", async () => {
    let target = "";
    globalThis.fetch = mock(async (url: unknown) => {
      target = String(url);
      return Response.json([]);
    }) as unknown as typeof fetch;
    await listTools({ integration: "demo", owner: "user", connection: "main & spare" });
    const url = new URL(target);
    expect(url.searchParams.get("connection")).toBe("main & spare");
    expect(url.searchParams.get("owner")).toBe("user");
  });
  test("resume targets the same execution and passes requested input", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = mock(async (url: unknown, init?: RequestInit) => {
      request = { url: String(url), init };
      return Response.json({ status: "completed", text: "", structured: null, isError: false });
    }) as unknown as typeof fetch;
    await resumeExecution("pause/1", "accept", { enabled: false, count: 0 });
    expect(request?.url).toEndWith("/api/executions/pause%2F1/resume");
    expect(JSON.parse(String(request?.init?.body))).toEqual({
      action: "accept",
      content: { enabled: false, count: 0 },
    });
  });
});
