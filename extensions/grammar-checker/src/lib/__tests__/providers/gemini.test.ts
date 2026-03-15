import { describe, it, expect, vi, beforeEach } from "vitest";
import { geminiGrammarCheck } from "../../providers/gemini";

function sseBody(textChunks: string[]): string {
  const lines = textChunks.map(
    (text) => `data: {"candidates":[{"content":{"parts":[{"text":${JSON.stringify(text)}}]}}]}`,
  );
  return lines.join("\n");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("geminiGrammarCheck", () => {
  it("sends correct request and parses streamed response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sseBody(["Hello", " world."]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await geminiGrammarCheck({
      text: "hello world",
      apiKey: "AIzaTestKey123",
      model: "gemini-2.0-flash",
      prompt: "Fix grammar.",
    });

    expect(result).toBe("Hello world.");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent");
    expect(url).toContain("alt=sse");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.systemInstruction.parts[0].text).toBe("Fix grammar.");
    expect(body.contents[0].parts[0].text).toBe("hello world");
  });

  it("passes API key in URL query parameter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => sseBody(["ok"]),
      }),
    );

    await geminiGrammarCheck({
      text: "test",
      apiKey: "AIzaTestKey123",
      model: "gemini-2.0-flash",
      prompt: "Fix.",
    });

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("key=AIzaTestKey123");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => '{"error":"forbidden"}',
      }),
    );

    await expect(
      geminiGrammarCheck({
        text: "test",
        apiKey: "AIzaBadKey",
        model: "gemini-2.0-flash",
        prompt: "Fix.",
      }),
    ).rejects.toThrow("Gemini API error (403)");
  });

  it("throws on empty response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "",
      }),
    );

    await expect(
      geminiGrammarCheck({
        text: "test",
        apiKey: "AIzaTestKey123",
        model: "gemini-2.0-flash",
        prompt: "Fix.",
      }),
    ).rejects.toThrow("Empty response from Gemini");
  });

  it("uses custom model in URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => sseBody(["done"]),
      }),
    );

    await geminiGrammarCheck({
      text: "test",
      apiKey: "AIzaTestKey123",
      model: "gemini-2.5-flash-preview-05-20",
      prompt: "Fix.",
    });

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("models/gemini-2.5-flash-preview-05-20");
  });

  it("handles multiple candidates parts", async () => {
    const body = ['data: {"candidates":[{"content":{"parts":[{"text":"Part 1"},{"text":" Part 2"}]}}]}'].join("\n");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => body,
      }),
    );

    const result = await geminiGrammarCheck({
      text: "test",
      apiKey: "AIzaTestKey123",
      model: "gemini-2.0-flash",
      prompt: "Fix.",
    });

    expect(result).toBe("Part 1 Part 2");
  });
});
