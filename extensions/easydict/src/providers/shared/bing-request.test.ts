import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageDetectType, TranslationType } from "@/core/results/kinds";
import { BingDetectProvider } from "@/providers/detect/bing";
import { BingTranslateProvider } from "@/providers/translation/bing";
import { CancelledError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ bingHost: "www.bing.com" }),
  environment: { isDevelopment: false },
  Cache: class {
    get(key: string) {
      return storage.get(key);
    }
    set(key: string, value: string) {
      storage.set(key, value);
    }
  },
}));

vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("@/shared/http", () => ({ timedFetch: { raw: vi.fn() } }));

const fetchRaw = vi.mocked(timedFetch.raw);
const query = { word: "hello & goodbye\nworld", fromLanguage: "en", toLanguage: "zh-CHS" };
const translation = {
  detectedLanguage: { language: "en", score: 1 },
  translations: [{ text: "你好\n\n世界", to: "zh-Hans", sentLen: { srcSentLen: [5], transSentLen: [2] } }],
};
const consumers = [
  {
    name: "detection",
    run: (signal?: AbortSignal) => new BingDetectProvider().detect(query.word, { signal }),
    fromLang: "auto-detect",
    to: "en",
  },
  {
    name: "translation",
    run: (signal?: AbortSignal) => new BingTranslateProvider().request(query, { signal }).next(),
    fromLang: "en",
    to: "zh-Hans",
  },
];

function response(url: string, data: unknown, status = 200, location?: string) {
  const result = Object.assign(new Response(null, { status, headers: location ? { location } : undefined }), {
    _data: data,
  });
  Object.defineProperty(result, "url", { value: url });
  return result;
}

function configuration(url: string) {
  return response(
    url,
    `IG:"test-ig" data-iid="translator.5023"; var params_AbusePreventionHelper = ["${Date.now()}","test-token",3600000];`,
  );
}

function postCalls() {
  return fetchRaw.mock.calls.filter(([, options]) => options?.method === "POST");
}

beforeEach(() => {
  storage.clear();
  fetchRaw.mockReset();
});

describe("Bing request protocol", () => {
  it("shares cold-start configuration while assigning distinct IIDs to detection and translation", async () => {
    fetchRaw.mockImplementation(async (url, options) =>
      options?.method === "POST" ? response(String(url), [translation]) : configuration(String(url)),
    );

    const [detected, translated] = await Promise.all([
      new BingDetectProvider().detect(query.word),
      new BingTranslateProvider().request(query).next(),
    ]);

    expect(fetchRaw.mock.calls.filter(([, options]) => options?.method !== "POST")).toHaveLength(1);
    expect(postCalls().map(([url]) => new URL(String(url)).searchParams.get("IID"))).toEqual([
      "translator.5023.2",
      "translator.5023.3",
    ]);
    expect(detected).toEqual({
      type: LanguageDetectType.Bing,
      kind: "single",
      language: "en",
    });
    expect(translated).toEqual({
      done: true,
      value: {
        type: TranslationType.Bing,
        content: { kind: "translation", query, paragraphs: ["你好", "", "世界"] },
      },
    });
  });

  it.each(consumers)(
    "preserves the $name POST body and signal across a manual redirect",
    async ({ run, fromLang, to }) => {
      const controller = new AbortController();
      const redirectedUrl = "https://cn.bing.com/ttranslatev3?redirected=1";
      fetchRaw.mockImplementation(async (url, options) => {
        if (options?.method !== "POST") return configuration(String(url));
        return String(url) === redirectedUrl
          ? response(String(url), [translation])
          : response(String(url), undefined, 302, redirectedUrl);
      });

      await run(controller.signal);

      const posts = postCalls();
      expect(posts).toHaveLength(2);
      expect(posts[1][0]).toBe(redirectedUrl);
      expect(new URL(String(posts[0][0])).searchParams.get("IG")).toBe("test-ig");
      for (const [, options] of posts) {
        expect(options).toMatchObject({
          method: "POST",
          redirect: "manual",
          signal: controller.signal,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        expect(Object.fromEntries(new URLSearchParams(String(options?.body)))).toEqual({
          text: query.word,
          fromLang,
          to,
          key: expect.stringMatching(/^\d+$/),
          token: "test-token",
        });
      }
      expect(posts[1][1]?.body).toBe(posts[0][1]?.body);
    },
  );

  it.each(consumers)("normalizes a cancelled $name request without retrying", async ({ run }) => {
    const controller = new AbortController();
    fetchRaw.mockImplementation(async (url, options) => {
      if (options?.method !== "POST") return configuration(String(url));
      controller.abort();
      throw new Error("Request aborted by the network client");
    });

    await expect(run(controller.signal)).rejects.toBeInstanceOf(CancelledError);
    expect(postCalls()).toHaveLength(1);
  });

  it.each([
    { consumer: consumers[0], data: [], message: "Bing detect: invalid response" },
    { consumer: consumers[1], data: [{ translations: [] }], message: "Bing translate response is invalid" },
  ])("keeps $consumer.name response validation in the provider", async ({ consumer, data, message }) => {
    fetchRaw.mockImplementation(async (url, options) =>
      options?.method === "POST" ? response(String(url), data) : configuration(String(url)),
    );

    await expect(consumer.run()).rejects.toMatchObject({ name: "RequestError", message });
    expect(postCalls()).toHaveLength(1);
  });

  it.each(["{bad", { expirationInterval: "invalid" }, { count: "1" }, { token: "" }])(
    "refetches malformed persisted configuration before sending a request (%j)",
    async (override) => {
      storage.set(
        "BingConfig",
        typeof override === "string"
          ? override
          : JSON.stringify({
              IG: "old-ig",
              IID: "old-iid",
              key: String(Date.now()),
              token: "old-token",
              expirationInterval: "3600000",
              count: 1,
              ...override,
            }),
      );
      fetchRaw.mockImplementation(async (url, options) =>
        options?.method === "POST" ? response(String(url), [translation]) : configuration(String(url)),
      );
      await new BingTranslateProvider().request(query).next();
      expect(fetchRaw.mock.calls.filter(([, options]) => options?.method !== "POST")).toHaveLength(1);
      expect(new URL(String(postCalls()[0][0])).searchParams.get("IID")).toBe("translator.5023.2");
    },
  );

  it("rejects a non-string first translated text without retrying", async () => {
    fetchRaw.mockImplementation(async (url, options) =>
      options?.method === "POST"
        ? response(String(url), [{ translations: [{ text: 42 }] }])
        : configuration(String(url)),
    );
    await expect(new BingTranslateProvider().request(query).next()).rejects.toMatchObject({
      message: "Bing translate response is invalid",
    });
    expect(postCalls()).toHaveLength(1);
  });

  it("reuses valid persisted numeric token keys and string expiration intervals", async () => {
    const tokenStart = Date.now();
    storage.set(
      "BingConfig",
      JSON.stringify({
        IG: "old-ig",
        IID: "old-iid",
        key: tokenStart,
        token: "old-token",
        expirationInterval: "3600000",
        count: 7,
      }),
    );
    fetchRaw.mockImplementation(async (url) => response(String(url), [translation]));

    await new BingTranslateProvider().request(query).next();

    expect(fetchRaw).toHaveBeenCalledOnce();
    expect(new URL(String(postCalls()[0][0])).searchParams.get("IID")).toBe("old-iid.8");
    expect(Object.fromEntries(new URLSearchParams(String(postCalls()[0][1]?.body)))).toMatchObject({
      key: String(tokenStart),
      token: "old-token",
    });
  });

  it.each(["{bad", '["invalid","token",3600000]', "[1,42,3600000]"])(
    "limits retries for malformed HTML configuration (%s) before making a translation request",
    async (params) => {
      fetchRaw.mockImplementation(async (url) =>
        response(String(url), `IG:"test-ig"; var params_AbusePreventionHelper = ${params};`),
      );

      await expect(new BingTranslateProvider().request(query).next()).rejects.toMatchObject({
        message: "Bing: failed to get config",
      });

      expect(fetchRaw).toHaveBeenCalledTimes(2);
      expect(postCalls()).toHaveLength(0);
    },
  );

  it("uses a still-valid token while refreshing it after half its lifetime", async () => {
    storage.set(
      "BingConfig",
      JSON.stringify({
        IG: "old-ig",
        IID: "old-iid",
        key: String(Date.now() - 2_000),
        token: "old-token",
        expirationInterval: 3_000,
        count: 1,
      }),
    );
    let finishRefresh!: (value: ReturnType<typeof configuration>) => void;
    const refresh = new Promise<ReturnType<typeof configuration>>((resolve) => {
      finishRefresh = resolve;
    });
    fetchRaw.mockImplementation(async (url, options) =>
      options?.method === "POST" ? response(String(url), [translation]) : refresh,
    );

    await new BingTranslateProvider().request(query).next();
    expect(new URL(String(postCalls()[0][0])).searchParams.get("IID")).toBe("old-iid.2");
    expect(Object.fromEntries(new URLSearchParams(String(postCalls()[0][1]?.body)))).toMatchObject({
      token: "old-token",
    });

    finishRefresh(configuration("https://www.bing.com/translator"));
    await vi.waitFor(() => expect(storage.get("BingConfig")).toContain("test-token"));
    await new BingTranslateProvider().request(query).next();
    expect(new URL(String(postCalls()[1][0])).searchParams.get("IID")).toBe("translator.5023.2");
    expect(fetchRaw.mock.calls.filter(([, options]) => options?.method !== "POST")).toHaveLength(1);
  });

  it("refreshes configuration and recovers from an empty translation after a host change", async () => {
    let redirectedRequests = 0;
    fetchRaw.mockImplementation(async (url, options) => {
      if (options?.method !== "POST") return configuration(String(url));
      const redirectUrl = String(url).replace("www.bing.com", "cn.bing.com");
      if (String(url) !== redirectUrl) return response(String(url), undefined, 302, redirectUrl);
      redirectedRequests++;
      return response(String(url), redirectedRequests === 1 ? undefined : [translation]);
    });

    const result = await new BingTranslateProvider().request(query).next();

    expect(result.value).toMatchObject({ content: { paragraphs: ["你好", "", "世界"] } });
    expect(redirectedRequests).toBe(2);
    expect(fetchRaw.mock.calls.filter(([, options]) => options?.method !== "POST")).toHaveLength(2);
  });

  it.each([
    { consumer: consumers[0], changeHost: true, attempts: 1, message: "Bing detect: empty response" },
    { consumer: consumers[1], changeHost: false, attempts: 1, message: "Bing translate response is empty" },
    { consumer: consumers[1], changeHost: true, attempts: 4, message: "Bing translate response is empty" },
  ])(
    "limits $consumer.name empty-response attempts to $attempts when changeHost=$changeHost",
    async ({ consumer, changeHost, attempts, message }) => {
      fetchRaw.mockImplementation(async (url, options) => {
        if (options?.method !== "POST") return configuration(String(url));
        const redirectUrl = String(url).replace("www.bing.com", "cn.bing.com");
        if (changeHost && String(url) !== redirectUrl) return response(String(url), undefined, 302, redirectUrl);
        return response(String(url), undefined);
      });

      await expect(consumer.run()).rejects.toMatchObject({ name: "RequestError", message });
      expect(fetchRaw.mock.calls.filter(([, options]) => options?.method !== "POST")).toHaveLength(attempts);
      expect(postCalls()).toHaveLength(attempts * (changeHost ? 2 : 1));
    },
  );
});
