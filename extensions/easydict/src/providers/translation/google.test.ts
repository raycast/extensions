import { afterEach, describe, expect, it, vi } from "vitest";

import { TranslationType } from "@/types/api";
import { CancelledError } from "@/utils/errors";

import { GoogleTranslateProvider } from "./google";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({}),
  environment: { isDevelopment: false },
}));

vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Google translation", () => {
  it("translates through RPC and preserves literal text and paragraph breaks", async () => {
    const translatedText = "第一行 &amp; <文本>。\n\n第二段。";
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(rpcBody(translatedText)));
    vi.stubGlobal("fetch", fetch);
    const query = { word: "First & second.\n\nNext paragraph.", fromLanguage: "en", toLanguage: "zh-CHT" };

    const result = await new GoogleTranslateProvider().request(query).next();

    expect(result).toEqual({
      done: true,
      value: {
        type: TranslationType.Google,
        translations: ["第一行 &amp; <文本>。", "", "第二段。"],
        queryWordInfo: query,
      },
    });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/_/TranslateWebserverUi/data/batchexecute");
    expect(options?.method).toBe("POST");
    const body = new URLSearchParams(String(options?.body)).get("f.req");
    expect(body).toBe(
      JSON.stringify([[["MkEWBc", JSON.stringify([[query.word, "en", "zh-TW", false], [null]]), null, "0"]]]),
    );
  });

  it.each([1831, 5000])("sends all %i characters without truncation", async (length) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(rpcBody("完整译文")));
    vi.stubGlobal("fetch", fetch);
    const query = { ...createQuery(), word: "a".repeat(length - 4) + "TAIL" };

    await new GoogleTranslateProvider().request(query).next();

    expect(fetch).toHaveBeenCalledOnce();
    expect(requestedTexts(fetch.mock.calls[0][1])).toEqual([query.word]);
  });

  it("translates long paragraphs in one batch and restores their order and paragraph breaks", async () => {
    const paragraphs = ["First paragraph. ".repeat(200).trim(), "Second paragraph. ".repeat(200).trim()];
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(rpcBody("第一段。", "第二段。")));
    vi.stubGlobal("fetch", fetch);
    const query = { ...createQuery(), word: paragraphs.join("\n\n") };

    const result = await new GoogleTranslateProvider().request(query).next();

    expect(fetch).toHaveBeenCalledOnce();
    expect(requestedTexts(fetch.mock.calls[0][1])).toEqual(paragraphs);
    expect(result.value).toMatchObject({
      translations: ["第一段。", "", "第二段。"],
      queryWordInfo: query,
    });
  });

  it.each([
    {
      boundary: "sentences",
      word: "The book is very ".repeat(180) + "interesting. " + "The river is very ".repeat(180) + "beautiful.",
      chunks: ["The book is very ".repeat(180) + "interesting.", "The river is very ".repeat(180) + "beautiful."],
    },
    {
      boundary: "Chinese sentence punctuation",
      word: "春".repeat(3000) + "。" + "秋".repeat(3000) + "。",
      chunks: ["春".repeat(3000) + "。", "秋".repeat(3000) + "。"],
    },
    {
      boundary: "word boundaries in an oversized sentence",
      word: "word ".repeat(1100).trim(),
      chunks: ["word ".repeat(1000).trim(), "word ".repeat(100).trim()],
    },
    {
      boundary: "a Unicode character crossing the size limit",
      word: "a".repeat(4999) + "😀TAIL",
      chunks: ["a".repeat(4999), "😀TAIL"],
    },
    {
      boundary: "several chunks without natural breaks",
      word: "a".repeat(10000) + "TAIL",
      chunks: ["a".repeat(5000), "a".repeat(5000), "TAIL"],
    },
  ])("keeps all text when splitting at $boundary", async ({ word, chunks }) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(rpcBody(...chunks.map((_, index) => `译文${index}`))));
    vi.stubGlobal("fetch", fetch);

    const result = await new GoogleTranslateProvider().request({ ...createQuery(), word }).next();

    expect(fetch).toHaveBeenCalledOnce();
    expect(requestedTexts(fetch.mock.calls[0][1])).toEqual(chunks);
    expect(result.value).toMatchObject({ translations: [chunks.map((_, index) => `译文${index}`).join(" ")] });
  });

  it.each([
    ["missing the final chunk", rpcBody("第一段")],
    ["missing the first chunk", rpcBody(undefined, "第二段")],
    ["containing an empty chunk", rpcBody("第一段", " \n")],
  ])("rejects a batch %s instead of returning a partial translation", async (_scenario, body) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body));
    vi.stubGlobal("fetch", fetch);

    await expect(
      new GoogleTranslateProvider().request({ ...createQuery(), word: "a".repeat(5001) }).next(),
    ).rejects.toMatchObject({ name: "RequestError", code: "INVALID_RESPONSE" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("reports rate limiting without sending another request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
      return new Response("Too Many Requests", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Retry-After": "60" },
      });
    });
    vi.stubGlobal("fetch", fetch);

    const request = new GoogleTranslateProvider().request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    await expect(request.next()).rejects.toMatchObject({
      name: "RequestError",
      type: TranslationType.Google,
      code: "429",
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([
    ["an HTML challenge", "<html>Please verify that you are human.</html>"],
    ["an empty translation", rpcBody(" \n")],
  ])("rejects %s instead of returning a successful empty result", async (_scenario, body) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body));
    vi.stubGlobal("fetch", fetch);

    await expect(new GoogleTranslateProvider().request(createQuery()).next()).rejects.toMatchObject({
      name: "RequestError",
      code: "INVALID_RESPONSE",
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("cancels an in-flight batch without falling back to another endpoint", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, options) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      });
    });
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    const request = new GoogleTranslateProvider().request(
      { ...createQuery(), word: "a".repeat(5001) },
      { signal: controller.signal },
    );
    const rejection = expect(request.next()).rejects.toBeInstanceOf(CancelledError);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();

    await rejection;
    expect(requestedTexts(fetch.mock.calls[0][1])).toHaveLength(2);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("reports a timeout while reading the RPC body even when a query signal is supplied", async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, options) => {
      return new Response(
        new ReadableStream({
          start(controller) {
            options?.signal?.addEventListener(
              "abort",
              () => controller.error(new DOMException("The operation was aborted", "AbortError")),
              { once: true },
            );
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    const request = new GoogleTranslateProvider().request(createQuery(), { signal: controller.signal });
    const rejection = expect(request.next()).rejects.toMatchObject({ name: "RequestError", code: "TIMEOUT" });

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    deadline.abort(new DOMException("The operation timed out", "TimeoutError"));

    await rejection;
    expect(controller.signal.aborted).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
  });
});

function createQuery() {
  return { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };
}

function requestedTexts(options: RequestInit | undefined) {
  const body = new URLSearchParams(String(options?.body)).get("f.req");
  const requests: [Array<[string, string]>] = JSON.parse(body ?? "");
  return requests[0].map(([, payload]) => {
    const [[text]]: [[string]] = JSON.parse(payload);
    return text;
  });
}

function rpcBody(...texts: Array<string | undefined>) {
  // The RPC wraps a JSON-encoded translation payload in an anti-XSSI-prefixed envelope.
  const responses = texts.flatMap((text, index) => {
    if (text === undefined) return [];
    const payload = [null, [[[null, null, null, null, null, [[text]]]], null, null, "en"]];
    return [["wrb.fr", "MkEWBc", JSON.stringify(payload), null, null, null, index.toString(36)]];
  });
  // Batch replies can arrive out of order; the RPC IDs must restore the input order.
  return `)]}'\n\n${JSON.stringify(responses.reverse())}\n`;
}
