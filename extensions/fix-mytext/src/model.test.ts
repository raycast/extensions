import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  buildChatCompletionsUrl,
  buildInstruction,
  buildPrompt,
  normalizeTemperature,
  resolveRevisionRequest,
  reviseText,
} from "./model";

const baseRequest = {
  baseUrl: "http://127.0.0.1:11434/v1",
  model: "llama3.2",
  systemPrompt: "Revise text only.",
  temperature: 0.2,
  sourceText: "helo world",
  instruction: "Fix spelling.",
};

describe("buildChatCompletionsUrl", () => {
  it("uses an existing chat completions URL as-is", () => {
    expect(buildChatCompletionsUrl("http://127.0.0.1:1234/v1/chat/completions")).toBe(
      "http://127.0.0.1:1234/v1/chat/completions",
    );
  });

  it("appends chat completions to a v1 base URL", () => {
    expect(buildChatCompletionsUrl(" http://127.0.0.1:11434/v1/ ")).toBe("http://127.0.0.1:11434/v1/chat/completions");
  });

  it("adds v1 chat completions to a server root", () => {
    expect(buildChatCompletionsUrl("http://127.0.0.1:1234")).toBe("http://127.0.0.1:1234/v1/chat/completions");
  });

  it("requires a base URL", () => {
    expect(() => buildChatCompletionsUrl(" ")).toThrow("Base URL is required.");
  });
});

describe("buildPrompt", () => {
  it("keeps instruction and source text in a text-only revision prompt", () => {
    expect(buildPrompt("Keep this sentence.", "Fix grammar.")).toBe(
      ["Instruction: Fix grammar.", "", "Return only the revised text.", "", "Text:", "Keep this sentence."].join("\n"),
    );
  });
});

describe("normalizeTemperature", () => {
  it.each([
    [-1, 0],
    [0.7, 0.7],
    [3, 2],
    [Number.NaN, 0.2],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeTemperature(input)).toBe(expected);
  });
});

describe("buildInstruction", () => {
  it("joins the preset instruction with trimmed custom instructions", () => {
    expect(buildInstruction("Fix grammar.", "  Keep my voice.  ")).toBe("Fix grammar. Keep my voice.");
  });

  it("drops empty custom instructions", () => {
    expect(buildInstruction("Fix grammar.", "   ")).toBe("Fix grammar.");
  });
});

describe("resolveRevisionRequest", () => {
  const preferences = {
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "llama3.2",
    apiKey: "token",
    systemPrompt: "Revise text only.",
    temperature: "0.7",
  };

  const input = {
    sourceText: "helo world",
    presetInstruction: "Fix grammar.",
    customInstructions: "Keep my voice.",
  };

  it("builds a request from raw preferences and form input", () => {
    expect(resolveRevisionRequest(preferences, input)).toEqual({
      baseUrl: "http://127.0.0.1:1234/v1",
      model: "llama3.2",
      apiKey: "token",
      systemPrompt: "Revise text only.",
      temperature: 0.7,
      sourceText: "helo world",
      instruction: "Fix grammar. Keep my voice.",
    });
  });

  it("falls back to the local defaults when base URL and model are blank", () => {
    const resolved = resolveRevisionRequest({ ...preferences, baseUrl: "  ", model: "" }, input);
    expect(resolved.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(resolved.model).toBe(DEFAULT_MODEL);
  });

  it("parses the temperature string and leaves clamping to reviseText", () => {
    expect(resolveRevisionRequest({ ...preferences, temperature: "5" }, input).temperature).toBe(5);
    expect(resolveRevisionRequest({ ...preferences, temperature: "not a number" }, input).temperature).toBeNaN();
  });
});

describe("reviseText", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the expected OpenAI-compatible chat request", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "Hello world." } }],
      }),
    );

    await expect(reviseText({ ...baseRequest, apiKey: " local-token ", temperature: 5 })).resolves.toBe("Hello world.");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer local-token",
        },
      }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(body).toMatchObject({
      model: "llama3.2",
      stream: false,
      temperature: 2,
      messages: [
        { role: "system", content: "Revise text only." },
        {
          role: "user",
          content: buildPrompt("helo world", "Fix spelling."),
        },
      ],
    });
  });

  it("omits the authorization header when no API key is set", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "Hello." } }],
      }),
    );

    await reviseText({ ...baseRequest, apiKey: " " });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("uses an error message from an OpenAI-compatible error payload", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "model not found" } }, { status: 404 }));

    await expect(reviseText(baseRequest)).rejects.toThrow("model not found");
  });

  it("uses a status fallback when an error payload is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 500 }));

    await expect(reviseText(baseRequest)).rejects.toThrow("OpenAI-compatible request failed with status 500");
  });

  it("rejects empty successful responses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "   " } }],
      }),
    );

    await expect(reviseText(baseRequest)).rejects.toThrow("The local model returned an empty response.");
  });

  it("aborts and reports a timeout when the request exceeds the limit", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      );

      const promise = reviseText({ ...baseRequest, timeoutMs: 1000 });
      const expectation = expect(promise).rejects.toThrow("The request timed out");
      await vi.advanceTimersByTimeAsync(1001);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });
});

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}
