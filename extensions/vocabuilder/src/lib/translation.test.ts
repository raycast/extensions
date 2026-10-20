import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { translateWord, translateText } from "./translation";
import type { ProviderConfig } from "./providers/types";
import type { LanguagePair } from "./languages";

const pair: LanguagePair = {
  source: { code: "en", name: "English" },
  target: { code: "uk", name: "Ukrainian" },
};

const TEST_CONFIG: ProviderConfig = {
  provider: "gemini",
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
};

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

function lastGeminiRequestBody(): Record<string, unknown> {
  const body = vi.mocked(fetch).mock.calls.at(-1)?.[1]?.body;
  expect(typeof body).toBe("string");
  return JSON.parse(body as string) as Record<string, unknown>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("translateWord", () => {
  it("parses a valid provider response", async () => {
    const payload = {
      senses: [
        {
          translation: "привіт",
          partOfSpeech: "interjection",
          example: "Привіт!",
          exampleTranslation: "Hello!",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(1);
    expect(result.senses[0].translation).toBe("привіт");
    expect(result.senses[0].partOfSpeech).toBe("interjection");
  });

  it("requests structured JSON output for word translations", async () => {
    const payload = {
      senses: [
        {
          translation: "привіт",
          partOfSpeech: "interjection",
          example: "Привіт!",
          exampleTranslation: "Hello!",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await translateWord("hello", TEST_CONFIG, pair, undefined);

    const body = lastGeminiRequestBody();
    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        required: ["senses"],
      },
    });
    expect(
      (
        body.generationConfig as {
          responseJsonSchema: { properties: { senses: { items: { required: string[] } } } };
        }
      ).responseJsonSchema.properties.senses.items.required,
    ).toEqual(["translation", "partOfSpeech", "example", "exampleTranslation"]);
  });

  it("dedupes senses with same translation+POS even if examples differ", async () => {
    const dup = {
      translation: "привіт",
      partOfSpeech: "interjection",
      example: "Привіт!",
      exampleTranslation: "Hello there!",
    };
    const payload = {
      senses: [dup, { ...dup, example: "Привіт, друже!", exampleTranslation: "Hello, friend!" }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(1);
  });

  it("trims an over-long sense list to five after de-duplication instead of rejecting it", async () => {
    const sense = (translation: string) => ({
      translation,
      partOfSpeech: "noun",
      example: `${translation}.`,
      exampleTranslation: "A set of things.",
    });
    const payload = {
      senses: [
        sense("набір"),
        sense("набір"),
        ...["комплект", "сет", "партія", "серія", "група", "гарнітур"].map(sense),
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("set", TEST_CONFIG, pair, undefined);
    expect(result.senses.map((s) => s.translation)).toEqual(["набір", "комплект", "сет", "партія", "серія"]);
  });

  it("keeps same target gloss when part of speech differs", async () => {
    const base = {
      translation: "процент",
      example: "Привіт!",
      exampleTranslation: "Say hello to everyone.",
    };
    const payload = {
      senses: [
        { ...base, partOfSpeech: "noun" },
        { ...base, partOfSpeech: "verb", example: "Привіт, друже!", exampleTranslation: "Hello again!" },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(2);
    expect(result.senses.map((x) => x.partOfSpeech).sort()).toEqual(["noun", "verb"]);
  });

  it("throws word-not-found outcome when notAWord is true", async () => {
    const payload = { senses: [], notAWord: true };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // Outcome-domain tag is what the eval provider and translate.tsx switch on —
    // assert it explicitly so future shape changes can't silently misclassify.
    await expect(translateWord("xqzptl", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      message: "word-not-found",
      cause: { domain: "outcome", kind: "word-not-found" },
    });
  });

  it("throws invalid-response when senses array is empty without notAWord", async () => {
    const payload = { senses: [] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(translateWord("zzzqqq", TEST_CONFIG, pair, undefined)).rejects.toThrow("invalid-response");
  });

  it("keeps senses even when exampleTranslation does not contain the exact input", async () => {
    const payload = {
      senses: [
        {
          translation: "привіт",
          partOfSpeech: "interjection",
          example: "Привіт!",
          exampleTranslation: "Hello!",
        },
        {
          translation: "збірка",
          partOfSpeech: "noun",
          example: "Ця збірка оповідань.",
          exampleTranslation: "This collection of stories.",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(2);
    expect(result.senses.map((s) => s.translation)).toEqual(["привіт", "збірка"]);
  });

  it("keeps a valid sense even when the example uses a paraphrase", async () => {
    const payload = {
      senses: [
        {
          translation: "збірка",
          partOfSpeech: "noun",
          example: "Ця збірка оповідань.",
          exampleTranslation: "This collection of stories.",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await translateWord("omnibus", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(1);
    expect(result.senses[0].translation).toBe("збірка");
  });

  it("corrects a misspelled phrase", async () => {
    const payload = {
      senses: [
        {
          translation: "оманлива підказка",
          partOfSpeech: "idiom",
          example: "Ця підказка виявилася оманливою.",
          exampleTranslation: "That clue turned out to be a red herring.",
        },
      ],
      correctedWord: "red herring",
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("red hering", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(1);
    expect(result.correctedWord).toBe("red herring");
    expect(result.senses[0].partOfSpeech).toBe("idiom");
  });

  it("keeps corrected-word translations even when examples are inflected", async () => {
    const payload = {
      senses: [
        {
          translation: "бігти",
          partOfSpeech: "verb",
          example: "Він біжить швидко!",
          exampleTranslation: "She is running fast.",
        },
      ],
      correctedWord: "running",
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("runing", TEST_CONFIG, pair, undefined);
    expect(result.senses).toHaveLength(1);
    expect(result.correctedWord).toBe("running");
  });

  it("matches Cyrillic words in exampleTranslation with Unicode-aware boundaries", async () => {
    const reversePair: LanguagePair = {
      source: { code: "uk", name: "Ukrainian" },
      target: { code: "en", name: "English" },
    };
    const payload = {
      senses: [
        {
          translation: "hello",
          partOfSpeech: "interjection",
          example: "Hello there!",
          exampleTranslation: "Привіт!",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await translateWord("привіт", TEST_CONFIG, reversePair, undefined);
    expect(result.senses).toHaveLength(1);
    expect(result.senses[0].translation).toBe("hello");
  });

  it("throws invalid-api-key on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("invalid-api-key");
  });

  it("throws invalid-api-key on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Forbidden", { status: 403 }));
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("invalid-api-key");
  });

  it("throws request-failed with cause carrying status and body on non-401/403 failures", async () => {
    // Pin the retry sleep to 0 so this test stays fast.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const body = '{"error":{"code":429,"message":"Resource has been exhausted"}}';
    vi.mocked(fetch).mockImplementation(async () => new Response(body, { status: 429 }));
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      message: "request-failed",
      cause: {
        kind: "request-failed",
        surface: "translate",
        status: 429,
        body: expect.stringContaining("Resource has been exhausted"),
      },
    });
  });

  it("truncates long error bodies on the cause to 500 chars", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const huge = "x".repeat(2000);
    vi.mocked(fetch).mockImplementation(async () => new Response(huge, { status: 500 }));
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      cause: {
        status: 500,
        body: expect.stringMatching(/^x{500}$/),
      },
    });
  });

  it("throws empty-response when response text is empty", async () => {
    const body = {
      candidates: [{ content: { parts: [{ text: "" }] } }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("empty-response");
  });

  it("tags invalid-response with the configured provider", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody({ senses: [{ translation: 1 }] })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      cause: { domain: "infrastructure", kind: "invalid-response", provider: "gemini" },
    });
  });

  it("throws invalid-response when JSON is malformed", async () => {
    const body = {
      candidates: [{ content: { parts: [{ text: "not json at all" }] } }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("invalid-response");
  });

  it("throws invalid-word-input outcome for empty input", async () => {
    await expect(translateWord("", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      message: "invalid-word-input",
      cause: { domain: "outcome", kind: "invalid-word-input" },
    });
  });

  it("throws network-offline when fetch fails with a network TypeError", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("network-offline");
  });
});

describe("translateWord retry behavior", () => {
  // Pin Math.random to 0 so getRetryDelayMs() returns 0 and tests stay instant.
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  function successResponse(): Response {
    const payload = {
      senses: [
        {
          translation: "привіт",
          partOfSpeech: "noun",
          example: "Привіт, як справи?",
          exampleTranslation: "Hello, how are you?",
        },
      ],
    };
    return new Response(JSON.stringify(geminiJsonBody(payload)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("retries on 503 then succeeds on the next attempt", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("Service Unavailable", { status: 503 }))
      .mockResolvedValueOnce(successResponse());

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses[0].translation).toBe("привіт");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 then succeeds", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(successResponse());

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses[0].translation).toBe("привіт");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("retries NETWORK_OFFLINE (TypeError) then succeeds", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(successResponse());

    const result = await translateWord("hello", TEST_CONFIG, pair, undefined);
    expect(result.senses[0].translation).toBe("привіт");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("gives up after MAX_RETRY_ATTEMPTS and surfaces request-failed", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Service Unavailable", { status: 503 }));

    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      message: "request-failed",
      cause: { status: 503 },
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry 400 — fails fast on the first attempt", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Bad Request", { status: 400 }));

    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("request-failed");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry 401 — fails fast with invalid-api-key", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toThrow("invalid-api-key");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("throws model-not-found on 404 without retrying, carrying the model name in cause", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));
    const customModel = "gemini-bogus-model";

    await expect(translateWord("hello", { ...TEST_CONFIG, model: customModel }, pair, undefined)).rejects.toMatchObject(
      {
        message: "model-not-found",
        cause: {
          kind: "model-not-found",
          surface: "translate",
          model: customModel,
        },
      },
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("propagates the caller-supplied model through to the cause", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Not Found", { status: 404 }));
    await expect(translateWord("hello", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      cause: { model: TEST_CONFIG.model },
    });
  });

  it("aborts cleanly during retry backoff without making more fetch calls", async () => {
    const controller = new AbortController();
    // First fetch returns 503 *and* aborts the controller; the next abortableSleep
    // should reject immediately, before a second fetch is attempted.
    vi.mocked(fetch).mockImplementationOnce(async () => {
      controller.abort();
      return new Response("Service Unavailable", { status: 503 });
    });

    await expect(translateWord("hello", TEST_CONFIG, pair, controller.signal)).rejects.toThrow();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
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

    const result = await translateText("Hello world", TEST_CONFIG, pair, undefined);
    expect(result.translation).toBe("Привіт світ");
  });

  it("requests structured JSON output for text translations", async () => {
    const payload = { translation: "Привіт світ" };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(geminiJsonBody(payload)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await translateText("Hello world", TEST_CONFIG, pair, undefined);

    const body = lastGeminiRequestBody();
    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        required: ["translation"],
      },
    });
  });

  it("throws invalid-text-input outcome for empty input", async () => {
    await expect(translateText("", TEST_CONFIG, pair, undefined)).rejects.toMatchObject({
      message: "invalid-text-input",
      cause: { domain: "outcome", kind: "invalid-text-input" },
    });
  });

  it("throws network-offline when fetch fails with a network TypeError", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(translateText("Hello world", TEST_CONFIG, pair, undefined)).rejects.toThrow("network-offline");
  });
});
