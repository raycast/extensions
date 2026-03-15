import { describe, it, expect, vi, beforeEach } from "vitest";
import { codexGrammarCheck } from "../../providers/codex";

// Helper to create a fake JWT with a given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake-sig`;
}

const VALID_TOKEN = fakeJwt({
  "https://api.openai.com/auth": { chatgpt_account_id: "acc-123" },
});

function sseBody(chunks: string[]): string {
  const lines = chunks.map(
    (c) =>
      `data: {"type":"response.output_text.delta","delta":${JSON.stringify(c)}}`,
  );
  lines.push("data: [DONE]");
  return lines.join("\n");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("codexGrammarCheck", () => {
  it("sends correct request and parses streamed response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sseBody(["Hello", " world."]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await codexGrammarCheck({
      text: "hello world",
      token: VALID_TOKEN,
      model: "gpt-5.4",
      prompt: "Fix grammar.",
    });

    expect(result).toBe("Hello world.");

    // Verify fetch was called with correct URL and body
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://chatgpt.com/backend-api/codex/responses");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.model).toBe("gpt-5.4");
    expect(body.instructions).toBe("Fix grammar.");
    expect(body.input).toEqual([{ role: "user", content: "hello world" }]);
    expect(body.store).toBe(false);
    expect(body.stream).toBe(true);
  });

  it("sends ChatGPT-Account-ID header when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => sseBody(["ok"]),
      }),
    );

    await codexGrammarCheck({
      text: "test",
      token: VALID_TOKEN,
      model: "gpt-5.4",
      prompt: "Fix.",
    });

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers["ChatGPT-Account-ID"]).toBe("acc-123");
    expect(headers["Authorization"]).toBe(`Bearer ${VALID_TOKEN}`);
  });

  it("omits ChatGPT-Account-ID when token has no account claim", async () => {
    const tokenWithoutAccount = fakeJwt({ sub: "user-123" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => sseBody(["ok"]),
      }),
    );

    await codexGrammarCheck({
      text: "test",
      token: tokenWithoutAccount,
      model: "gpt-5.4",
      prompt: "Fix.",
    });

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers["ChatGPT-Account-ID"]).toBeUndefined();
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"detail":"bad request"}',
      }),
    );

    await expect(
      codexGrammarCheck({
        text: "test",
        token: VALID_TOKEN,
        model: "gpt-5.4",
        prompt: "Fix.",
      }),
    ).rejects.toThrow("OpenAI API error (400)");
  });

  it("throws on empty response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "data: [DONE]",
      }),
    );

    await expect(
      codexGrammarCheck({
        text: "test",
        token: VALID_TOKEN,
        model: "gpt-5.4",
        prompt: "Fix.",
      }),
    ).rejects.toThrow("Empty response from OpenAI");
  });

  it("uses custom model and prompt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => sseBody(["done"]),
      }),
    );

    await codexGrammarCheck({
      text: "test",
      token: VALID_TOKEN,
      model: "gpt-5.3-codex",
      prompt: "Rewrite formally.",
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.model).toBe("gpt-5.3-codex");
    expect(body.instructions).toBe("Rewrite formally.");
  });
});
