import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const { resolveGatewayConfig, materializeAvatarThumbnail, supportPath } = vi.hoisted(() => ({
  resolveGatewayConfig: vi.fn(),
  materializeAvatarThumbnail: vi.fn(async (): Promise<string | null> => null),
  supportPath: `/tmp/grok-bot-gateway-${process.pid}`,
}));

vi.mock("./preferences", () => ({
  resolveGatewayConfig,
}));

vi.mock("@raycast/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@raycast/api")>();
  return {
    ...actual,
    environment: { ...actual.environment, supportPath },
  };
});

vi.mock("./avatar-thumbnail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./avatar-thumbnail")>();
  return {
    ...actual,
    materializeAvatarThumbnail,
  };
});

import { listAgents, sendPrompt } from "./gateway";
import { parseAgentId } from "./types";

function mockConfig(url: string, token: string) {
  if (url.length === 0 || token.length === 0) {
    resolveGatewayConfig.mockReturnValue({ ok: false, error: { kind: "not-configured" } });
    return;
  }
  resolveGatewayConfig.mockReturnValue({
    ok: true,
    value: { gatewayUrl: url, gatewayToken: token },
  });
}

describe("gateway", () => {
  beforeEach(() => {
    mkdirSync(supportPath, { recursive: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns not-configured when preferences are missing", async () => {
    mockConfig("", "");
    const result = await listAgents();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "not-configured" });
    }
  });

  it("passes through a credentials-file error", async () => {
    resolveGatewayConfig.mockReturnValue({
      ok: false,
      error: { kind: "credentials-file", detail: "gateway.env must not be group or world readable" },
    });
    const result = await listAgents();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "credentials-file",
        detail: "gateway.env must not be group or world readable",
      });
    }
  });

  it("maps 401 to unauthorized", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 401 })),
    );

    const result = await listAgents();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "unauthorized" });
    }
  });

  it("maps network failures to unreachable", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );

    const result = await listAgents();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("unreachable");
      if (result.error.kind === "unreachable") {
        expect(result.error.cause).toContain("connection refused");
      }
    }
  });

  it("accepts an empty agent list", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([])),
    );

    const result = await listAgents();
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("lists agents from an array response", async () => {
    mockConfig("http://127.0.0.1:1340/", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json([
          {
            id: "a1",
            name: "Piper",
            title: "",
            description: "",
          },
        ]),
      ),
    );

    const result = await listAgents();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe("Piper");
    }

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:1340/api/listAgents",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("lists agents from an agents wrapper", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          agents: [{ id: "a1", name: "Piper", title: "", description: "" }],
        }),
      ),
    );

    const result = await listAgents();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe("Piper");
    }
  });

  it("emits each parsed bot as the stream closes an object", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('[{"id":"a1","name":"Piper"},{"id":"a2","name":"Scout"}]', { status: 200 })),
    );

    const updates: string[][] = [];
    const result = await listAgents({
      onUpdate: (bots) => {
        updates.push(bots.map((bot) => bot.name));
      },
    });

    expect(result.ok).toBe(true);
    expect(updates).toEqual([["Piper"], ["Piper", "Scout"]]);
  });

  it("returns aborted instead of a partial list when the request is cancelled", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    const encoder = new TextEncoder();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode('[{"id":"a1","name":"Piper"},'));
            const fail = () => {
              try {
                controller.error(Object.assign(new Error("aborted"), { name: "AbortError" }));
              } catch {
                return;
              }
            };
            if (init?.signal?.aborted) {
              fail();
              return;
            }
            init?.signal?.addEventListener("abort", fail);
          },
        });
        return new Response(stream, { status: 200 });
      }),
    );

    const abort = new AbortController();
    const updates: number[] = [];
    const result = await listAgents({
      signal: abort.signal,
      onUpdate: (bots) => {
        updates.push(bots.length);
        abort.abort();
      },
    });

    expect(updates).toEqual([1]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "unreachable", cause: "aborted" });
    }
  });

  it("strips avatar data URLs before parsing the agent list", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    const blob = "b".repeat(5000);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(`[{"id":"a1","name":"Piper","avatarDataUrl":"data:image/png;base64,${blob}"}]`, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const result = await listAgents();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.name).toBe("Piper");
      expect(result.value[0]?.avatarColor).toBeNull();
      expect(result.value[0]?.avatarHash).toBeNull();
    }
  });

  it("materializes avatar thumbnails from a captured image file", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const hash = createHash("sha256").update(Buffer.from(pngBase64, "base64")).digest("hex").slice(0, 16);
    materializeAvatarThumbnail.mockResolvedValue(hash);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(`[{"id":"a1","name":"Piper","avatarDataUrl":"${dataUrl}"}]`, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const result = await listAgents();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.avatarHash).toBe(hash);
    }
    expect(materializeAvatarThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "a1",
        hash,
      }),
    );
  });

  it("does not block the next onUpdate while the first thumbnail materializes", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const hash = createHash("sha256").update(Buffer.from(pngBase64, "base64")).digest("hex").slice(0, 16);
    const encoder = new TextEncoder();
    let releaseFirst: (() => void) | undefined;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    materializeAvatarThumbnail.mockImplementationOnce(async () => {
      await firstBlocked;
      return hash;
    });
    materializeAvatarThumbnail.mockResolvedValue(null);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(`[{"id":"a1","name":"Piper","avatarDataUrl":"${dataUrl}"},`));
            controller.enqueue(encoder.encode(`{"id":"a2","name":"Scout","avatarDataUrl":"${dataUrl}"}]`));
            controller.close();
          },
        });
        return new Response(stream, { status: 200 });
      }),
    );

    const updates: string[][] = [];
    const listPromise = listAgents({
      onUpdate: (bots) => {
        updates.push(bots.map((bot) => bot.name));
      },
    });

    await vi.waitFor(() => {
      expect(updates.some((names) => names.includes("Piper") && names.includes("Scout"))).toBe(true);
    });

    releaseFirst?.();
    const result = await listPromise;
    expect(result.ok).toBe(true);
  });

  it("keeps parsing later chunks while four thumbnails are already in flight", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const encoder = new TextEncoder();
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    materializeAvatarThumbnail.mockImplementation(async () => {
      await blocked;
      return "1111111111111111";
    });

    function agentJson(id: string, name: string) {
      return `{"id":"${id}","name":"${name}","avatarDataUrl":"${dataUrl}"}`;
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `[${agentJson("a1", "N1")},${agentJson("a2", "N2")},${agentJson("a3", "N3")},${agentJson("a4", "N4")},`,
              ),
            );
            controller.enqueue(encoder.encode(`${agentJson("a5", "N5")}]`));
            controller.close();
          },
        });
        return new Response(stream, { status: 200 });
      }),
    );

    const updates: string[][] = [];
    const listPromise = listAgents({
      onUpdate: (bots) => {
        updates.push(bots.map((bot) => bot.name));
      },
    });

    await vi.waitFor(() => {
      expect(updates.some((names) => names.includes("N5"))).toBe(true);
    });

    release?.();
    const result = await listPromise;
    expect(result.ok).toBe(true);
  });

  it("skips avatar materialization when avatars mode is skip", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(`[{"id":"a1","name":"Piper","avatarDataUrl":"${dataUrl}"}]`, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const result = await listAgents({ avatars: "skip" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.name).toBe("Piper");
      expect(result.value[0]?.avatarHash).toBeNull();
    }
    expect(materializeAvatarThumbnail).not.toHaveBeenCalled();
  });

  it("sendPrompt returns accepted on success", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ accepted: true })),
    );

    const agentId = parseAgentId("a1");
    expect(agentId.ok).toBe(true);
    if (!agentId.ok) {
      return;
    }

    const result = await sendPrompt({ agentId: agentId.value, prompt: "Do the thing" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ accepted: true });
    }
  });

  it("sendPrompt parses JSON without streaming agent objects", async () => {
    mockConfig("http://127.0.0.1:1340", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ accepted: true, avatarDataUrl: "ignored" })),
    );

    const agentId = parseAgentId("a1");
    expect(agentId.ok).toBe(true);
    if (!agentId.ok) {
      return;
    }

    const result = await sendPrompt({ agentId: agentId.value, prompt: "Do the thing" });
    expect(result.ok).toBe(true);
  });

  it("never includes the token in error strings", async () => {
    mockConfig("http://127.0.0.1:1340", "super-secret-token-value");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad gateway", { status: 502, statusText: "Bad Gateway" })),
    );

    const result = await listAgents();
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("super-secret-token-value");
  });

  it("redacts the token when the gateway echoes it in a rejected body", async () => {
    mockConfig("http://127.0.0.1:1340", "super-secret-token-value");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("token super-secret-token-value is invalid", { status: 500 })),
    );

    const result = await listAgents();
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("super-secret-token-value");
    expect(serialized).toContain("[redacted]");
  });
});
