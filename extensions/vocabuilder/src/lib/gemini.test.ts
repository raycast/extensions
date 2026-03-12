import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { translateWord, translateText } from "./gemini";
import type { LanguagePair } from "./languages";

const pair: LanguagePair = {
  source: { code: "en", name: "English" },
  target: { code: "uk", name: "Ukrainian" },
};

const API_KEY = "test-key";

function geminiJsonBody(payload: object): object {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(payload) }],
        },
      },
    ],
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("translateWord", () => {
  it("parses a valid Gemini response", async () => {
    const payload = {
      translation: "привіт",
      partOfSpeech: "interjection",
      example: "Hello!",
      exampleTranslation: "Привіт!",
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("hello", API_KEY, pair);
    expect(result.translation).toBe("привіт");
    expect(result.partOfSpeech).toBe("interjection");
  });

  it("throws INVALID_API_KEY on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(translateWord("hello", API_KEY, pair)).rejects.toThrow("INVALID_API_KEY");
  });

  it("throws INVALID_API_KEY on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Forbidden", { status: 403 }));
    await expect(translateWord("hello", API_KEY, pair)).rejects.toThrow("INVALID_API_KEY");
  });

  it("throws GEMINI_EMPTY_RESPONSE when response text is empty", async () => {
    const body = {
      candidates: [{ content: { parts: [{ text: "" }] } }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(translateWord("hello", API_KEY, pair)).rejects.toThrow("GEMINI_EMPTY_RESPONSE");
  });

  it("throws GEMINI_INVALID_RESPONSE when JSON is malformed", async () => {
    const body = {
      candidates: [{ content: { parts: [{ text: "not json at all" }] } }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(translateWord("hello", API_KEY, pair)).rejects.toThrow("GEMINI_INVALID_RESPONSE");
  });

  it("throws INVALID_WORD_INPUT for empty input", async () => {
    await expect(translateWord("", API_KEY, pair)).rejects.toThrow("INVALID_WORD_INPUT");
  });
});

describe("translateText", () => {
  it("parses a valid text translation response", async () => {
    const payload = { translation: "Привіт світ" };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateText("Hello world", API_KEY, pair);
    expect(result.translation).toBe("Привіт світ");
  });

  it("throws INVALID_TEXT_INPUT for empty input", async () => {
    await expect(translateText("", API_KEY, pair)).rejects.toThrow("INVALID_TEXT_INPUT");
  });
});
