import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import "./raycast-mock";

type AiTools = typeof import("../src/lib/ai-tools");
let aiTools: AiTools;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  aiTools = await import("../src/lib/ai-tools");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pause(interaction: Record<string, unknown>, executionId = "execution-1") {
  return {
    text: `Execution paused: ${String(interaction.message)}`,
    structured: {
      status: "waiting_for_interaction",
      executionId,
      interaction,
    },
  };
}

describe("AI tool input boundaries", () => {
  test("full-response inspection is opt-in and never changes the execution request", async () => {
    const full = {
      status: "completed",
      text: "Done",
      structured: { result: { ok: true, data: [1] }, emitted: 2 },
      isError: false,
    };
    globalThis.fetch = mock(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ code: "return 1;", autoApprove: null });
      return jsonResponse(full);
    }) as typeof fetch;
    const compact = await aiTools.executeExecutorCode({ code: "return 1;" });
    expect(compact.fullResponse).toBeUndefined();
    const expanded = await aiTools.executeExecutorCode({ code: "return 1;", includeFullResponse: true });
    expect(expanded.fullResponse).toEqual(full);
  });
  test("accepts only JSON object argument strings and preserves prototype-like keys", () => {
    expect(() => aiTools.parseArgumentsJson("[")).toThrow("valid JSON");
    expect(() => aiTools.parseArgumentsJson("[]")).toThrow("JSON object");

    const parsed = aiTools.parseArgumentsJson('{"__proto__":{"safe":true},"enabled":false,"count":0}');
    expect(Object.hasOwn(parsed, "__proto__")).toBe(true);
    expect(parsed.enabled).toBe(false);
    expect(parsed.count).toBe(0);
    expect(({} as Record<string, unknown>).safe).toBeUndefined();
  });

  test("creates a deterministic fingerprint for the exact server interaction", () => {
    const first = aiTools.pauseFingerprint({ message: "Approve", meta: { b: 2, a: 1 } });
    const reordered = aiTools.pauseFingerprint({ meta: { a: 1, b: 2 }, message: "Approve" });
    const changed = aiTools.pauseFingerprint({ message: "Approve", meta: { a: 1, b: 3 } });

    expect(first).toBe(reordered);
    expect(first).not.toBe(changed);
  });

  test("pretty prints exact arguments in the Raycast confirmation", () => {
    const confirmation = aiTools.callToolConfirmation({
      address: "tools.github.personal.default.issues_create",
      argumentsJson: '{"title":"Fix","draft":false}',
    });

    expect(confirmation.info?.[0].value).toBe("tools.github.personal.default.issues_create");
    expect(confirmation.info?.[1].value).toBe('{\n  "title": "Fix",\n  "draft": false\n}');
  });

  test("surfaces an upstream tool error even when the sandbox request completed", () => {
    const output = aiTools.executionOutput({
      status: "completed",
      text: "Denied",
      structured: { result: { ok: false, error: { message: "Denied" } } },
      isError: false,
    });

    expect(output.status).toBe("completed");
    expect(output.isError).toBe(true);
  });

  test("calls Executor without bypassing its server approval policy", async () => {
    let body: Record<string, unknown> | undefined;
    globalThis.fetch = mock(async (_request: RequestInfo | URL, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ status: "completed", text: "Done", structured: { result: { ok: true } }, isError: false });
    }) as typeof fetch;

    await aiTools.callExecutorTool({ address: "github.user.default.issues_list", argumentsJson: "{}" });
    expect(body?.autoApprove).toBeNull();
    expect(String(body?.code)).toContain('tools["github.user.default.issues_list"]');
  });
});

describe("bounded discovery", () => {
  test("requires a server-side search scope and bounds the returned catalog", async () => {
    expect(aiTools.discoverExecutorTools({})).rejects.toThrow("search query or an exact integration");
    expect(aiTools.discoverExecutorTools({ query: "issue", limit: 0.5 })).rejects.toThrow("positive whole number");

    const calls: string[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      calls.push(String(request));
      if (String(request).includes("/api/connections"))
        return jsonResponse([{ integration: "github", owner: "user", name: "default" }]);
      return jsonResponse(
        Array.from({ length: 60 }, (_, index) => ({
          address: `tools.github.user.default.tool_${index}`,
          owner: "user",
          integration: "github",
          connection: "default",
          name: `tool_${index}`,
          pluginId: "openapi",
          description: "Test tool",
        })),
      );
    }) as typeof fetch;

    const result = await aiTools.discoverExecutorTools({ integration: "github", limit: 100 });
    expect(result.returned).toBe(50);
    expect(result.totalMatched).toBe(60);
    expect(result.truncated).toBe(true);
    expect(result.offset).toBe(0);
    expect(result.nextOffset).toBe(50);
    expect(calls[0]).toContain("integration=github");
    expect(calls[0]).toContain("owner=user");

    const next = await aiTools.discoverExecutorTools({ integration: "github", offset: result.nextOffset });
    expect(next.returned).toBe(10);
    expect(next.nextOffset).toBeUndefined();
  });

  test("discovery paginates only connected or built-in tools and reports connection lookup failures", async () => {
    let failConnections = false;
    globalThis.fetch = mock(async (request: RequestInfo | URL) => {
      if (String(request).includes("/api/connections")) {
        return failConnections
          ? new Response("Unavailable", { status: 503 })
          : jsonResponse([{ integration: "github", owner: "user", name: "personal" }]);
      }
      return jsonResponse([
        { address: "orphan", integration: "github", owner: "org", connection: "personal" },
        { address: "connected", integration: "github", owner: "user", connection: "personal" },
        { address: "builtin", integration: "executor", static: true },
      ]);
    }) as typeof fetch;
    const first = await aiTools.discoverExecutorTools({ query: "tools", limit: 1 });
    expect(first.totalMatched).toBe(2);
    expect(first.tools.map((tool) => tool.address)).toEqual(["connected"]);
    const next = await aiTools.discoverExecutorTools({ query: "tools", limit: 1, offset: first.nextOffset });
    expect(next.tools.map((tool) => tool.address)).toEqual(["builtin"]);
    failConnections = true;
    await expect(aiTools.discoverExecutorTools({ query: "tools" })).rejects.toThrow();
  });

  test("paginates artifacts without returning preview markup", async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse(
        Array.from({ length: 51 }, (_, index) => ({
          id: `artifact-${index}`,
          owner: "user",
          title: `Artifact ${index}`,
          description: null,
          preview: { kind: "layout", markup: "x".repeat(10000) },
          createdAt: 1,
          updatedAt: 1,
        })),
      ),
    ) as typeof fetch;

    const result = await aiTools.listExecutorArtifacts({ limit: 20, offset: 40 });
    expect(result.returned).toBe(11);
    expect(result.nextOffset).toBeUndefined();
    expect(result.artifacts[0].hasPreview).toBe(true);
    expect(Object.hasOwn(result.artifacts[0], "preview")).toBe(false);
  });

  test("adds an API-principal-scoped console URL to an explicit artifact read", async () => {
    const responses = [
      {
        id: "artifact/1",
        owner: "user",
        title: "Artifact",
        description: null,
        preview: null,
        code: "return null",
        createdAt: 1,
        updatedAt: 1,
      },
      {
        status: "completed",
        text: "",
        structured: {
          result: {
            ok: true,
            data: {
              url: "https://executor.test/personal/integrations/executor",
              instructions: "Open it",
            },
          },
        },
        isError: false,
      },
    ];
    globalThis.fetch = mock(async () => jsonResponse(responses.shift())) as typeof fetch;

    const artifact = await aiTools.getExecutorArtifact({ artifactId: "artifact/1" });
    expect(artifact.url).toBe("https://executor.test/personal/artifacts/artifact%2F1");
    expect(artifact.linkUnavailable).toBeUndefined();
  });

  test("keeps artifact data when its validated console link cannot be resolved", async () => {
    const responses = [
      {
        id: "artifact-1",
        owner: "user",
        title: "Artifact",
        description: null,
        preview: null,
        code: "return null",
        createdAt: 1,
        updatedAt: 1,
      },
      { status: "completed", text: "", structured: { result: { ok: false } }, isError: false },
    ];
    globalThis.fetch = mock(async () => jsonResponse(responses.shift())) as typeof fetch;

    const artifact = await aiTools.getExecutorArtifact({ artifactId: "artifact-1" });
    expect(artifact.title).toBe("Artifact");
    expect(artifact.url).toBeUndefined();
    expect(artifact.linkUnavailable).toContain("Could not resolve");
  });
});

describe("paused execution continuation", () => {
  const interaction = {
    kind: "form",
    message: "Allow this tool call?",
    address: "tools.github.personal.default.issues_create",
    args: { title: "Fix" },
    meta: { grant: "one-time" },
  };

  test("returns the exact execution ID, terms, and fingerprint from a paused call", () => {
    const output = aiTools.executionOutput({ status: "paused", ...pause(interaction) });
    expect(output.status).toBe("paused");
    if (output.status !== "paused") throw new Error("Expected pause");
    expect(output.executionId).toBe("execution-1");
    expect(output.interaction).toEqual(interaction);
    expect(output.pauseFingerprint).toBe(aiTools.pauseFingerprint(interaction));
  });

  test("confirmation displays only fresh server-stored terms", async () => {
    globalThis.fetch = mock(async () => jsonResponse(pause(interaction))) as typeof fetch;
    const details = await aiTools.resumeExecutionConfirmation({
      executionId: "execution-1",
      pauseFingerprint: aiTools.pauseFingerprint(interaction),
      action: "accept",
    });

    expect(details.message).toBe("Execution paused: Allow this tool call?");
    expect(details.info?.find((item) => item.name === "Server Terms")?.value).toContain('"grant": "one-time"');
  });

  test("fails closed when terms changed and never posts a resume", async () => {
    const requests: RequestInit[] = [];
    globalThis.fetch = mock(async (_request: RequestInfo | URL, init?: RequestInit) => {
      requests.push(init ?? {});
      return jsonResponse(pause({ ...interaction, meta: { grant: "persistent" } }));
    }) as typeof fetch;

    await expect(
      aiTools.resumeExecutorExecution({
        executionId: "execution-1",
        pauseFingerprint: aiTools.pauseFingerprint(interaction),
        action: "accept",
      }),
    ).rejects.toThrow("terms changed");
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBeUndefined();
  });

  test("rechecks matching terms then posts exactly one chosen action", async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = mock(async (request: RequestInfo | URL, init?: RequestInit) => {
      const url = String(request);
      requests.push({ url, init });
      if (init?.method === "POST") {
        return jsonResponse({
          status: "completed",
          text: "Done",
          structured: { result: { ok: true } },
          isError: false,
        });
      }
      return jsonResponse(pause(interaction));
    }) as typeof fetch;

    const result = await aiTools.resumeExecutorExecution({
      executionId: "execution-1",
      pauseFingerprint: aiTools.pauseFingerprint(interaction),
      action: "decline",
    });

    expect(result.status).toBe("completed");
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toEndWith("/api/executions/execution-1");
    expect(requests[1].url).toEndWith("/api/executions/execution-1/resume");
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({ action: "decline", content: null });
  });

  test("requires response content when the fresh server pause requests fields", async () => {
    const formInteraction = {
      ...interaction,
      requestedSchema: { type: "object", required: ["answer"], properties: { answer: { type: "string" } } },
    };
    globalThis.fetch = mock(async () => jsonResponse(pause(formInteraction))) as typeof fetch;

    await expect(
      aiTools.resumeExecutionConfirmation({
        executionId: "execution-1",
        pauseFingerprint: aiTools.pauseFingerprint(formInteraction),
        action: "accept",
      }),
    ).rejects.toThrow("requires content");
  });

  test("blocks acceptance for an unknown server interaction kind", async () => {
    const unknownInteraction = { ...interaction, kind: "future-kind" };
    const requests: RequestInit[] = [];
    globalThis.fetch = mock(async (_request: RequestInfo | URL, init?: RequestInit) => {
      requests.push(init ?? {});
      return jsonResponse(pause(unknownInteraction));
    }) as typeof fetch;

    await expect(
      aiTools.resumeExecutorExecution({
        executionId: "execution-1",
        pauseFingerprint: aiTools.pauseFingerprint(unknownInteraction),
        action: "accept",
      }),
    ).rejects.toThrow("unknown interaction kind");
    expect(requests).toHaveLength(1);
  });

  test("fails closed when the server no longer has exact pause terms", async () => {
    globalThis.fetch = mock(async () => jsonResponse({ _tag: "ExecutionNotFoundError" }, 404)) as typeof fetch;

    await expect(
      aiTools.resumeExecutionConfirmation({
        executionId: "execution-1",
        pauseFingerprint: aiTools.pauseFingerprint(interaction),
        action: "accept",
      }),
    ).rejects.toThrow("Not found");
  });
});
