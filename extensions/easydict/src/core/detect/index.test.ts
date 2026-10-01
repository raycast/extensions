import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageDetectType } from "@/core/results/kinds";
import { BaseDetectProvider, type DetectOptions } from "@/providers/detect/base";
import type { DetectServiceConfig } from "@/providers/detect/registry";
import { CancelledError } from "@/shared/errors";

import { detectLanguage } from "./index";
import type { DetectionObservation } from "./types";

const doubles = vi.hoisted(() => ({
  services: [] as DetectServiceConfig[],
  settings: {
    enableDetectLanguageSpeedFirst: false,
    preferredLanguages: [{ youdaoLangCode: "en" }, { youdaoLangCode: "zh-CHS" }],
  },
  logError: vi.fn(),
  timerFail: vi.fn(),
}));
vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("@/core/config", () => ({ config: doubles.settings }));
vi.mock("@/providers/detect/registry", () => ({ detectServices: doubles.services }));
vi.mock("@/shared/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: doubles.timerFail }),
  logError: doubles.logError,
  logSummary: vi.fn(),
  logTrace: vi.fn(),
}));

function service(
  type: LanguageDetectType,
  request: (text: string, options?: DetectOptions) => Promise<DetectionObservation>,
  local = false,
): DetectServiceConfig {
  return {
    type,
    provider: class extends BaseDetectProvider {
      type = type;
      isLocal = local;
      isEnabled() {
        return true;
      }
      protected doDetect(text: string, options?: DetectOptions) {
        return request(text, options);
      }
    },
  };
}

function observed(type: LanguageDetectType, language: "en" | "ja" | "fr" | undefined): DetectionObservation {
  return Object.freeze({ kind: "single", type, language });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  doubles.services.length = 0;
  doubles.settings.enableDetectLanguageSpeedFirst = false;
  doubles.settings.preferredLanguages = [{ youdaoLangCode: "en" }, { youdaoLangCode: "zh-CHS" }];
  vi.clearAllMocks();
});

describe("detection policy and ownership", () => {
  it("confirms agreeing detectors, cancels unfinished work, and does not mutate observations", async () => {
    const first = observed(LanguageDetectType.Baidu, "en");
    const second = observed(LanguageDetectType.Tencent, "en");
    const aborted = vi.fn();
    doubles.services.push(
      service(LanguageDetectType.Baidu, async () => first),
      service(LanguageDetectType.Tencent, async () => second),
      service(
        LanguageDetectType.Bing,
        (_text, options) =>
          new Promise((_, reject) => {
            options?.signal?.addEventListener(
              "abort",
              () => {
                aborted();
                reject(new DOMException("cancelled", "AbortError"));
              },
              { once: true },
            );
          }),
      ),
    );
    expect(await detectLanguage("Testimony")).toEqual({
      type: LanguageDetectType.Tencent,
      language: "en",
      confirmed: true,
    });
    expect(aborted).toHaveBeenCalledOnce();
    expect(first).toEqual({ kind: "single", type: LanguageDetectType.Baidu, language: "en" });
    expect(doubles.logError).not.toHaveBeenCalled();
    expect(doubles.timerFail).not.toHaveBeenCalled();
  });

  it("does not construct detectors for an already cancelled query", async () => {
    const provider = vi.fn(
      service(LanguageDetectType.Bing, async () => observed(LanguageDetectType.Bing, "en")).provider,
    );
    doubles.services.push({ type: LanguageDetectType.Bing, provider });
    const controller = new AbortController();
    controller.abort();
    await expect(detectLanguage("test", controller.signal)).rejects.toBeInstanceOf(CancelledError);
    expect(provider).not.toHaveBeenCalled();
  });

  it("keeps each overlapping detection's detector count and language preferences", async () => {
    const first = deferred<DetectionObservation>();
    const second = deferred<DetectionObservation>();
    doubles.services.push(
      service(LanguageDetectType.Bing, () => first.promise),
      service(LanguageDetectType.Tencent, () => second.promise),
    );
    let settled = false;
    const oldQuery = detectLanguage("older").then((value) => {
      settled = true;
      return value;
    });

    doubles.services.splice(
      0,
      doubles.services.length,
      service(LanguageDetectType.Baidu, async () => observed(LanguageDetectType.Baidu, "fr")),
    );
    doubles.settings.preferredLanguages = [{ youdaoLangCode: "fr" }];
    doubles.settings.enableDetectLanguageSpeedFirst = true;
    expect(await detectLanguage("newer")).toMatchObject({ language: "fr", confirmed: true });

    first.resolve(observed(LanguageDetectType.Bing, "en"));
    await new Promise((resolve) => setImmediate(resolve));
    expect(settled).toBe(false);
    second.resolve(observed(LanguageDetectType.Tencent, "ja"));
    expect(await oldQuery).toEqual({ type: LanguageDetectType.Bing, language: "en", confirmed: false });
  });

  it("keeps the initial preferred languages while local detection is pending", async () => {
    const local = deferred<DetectionObservation>();
    doubles.services.push(service(LanguageDetectType.Franc, () => local.promise, true));
    const result = detectLanguage("a sentence");
    doubles.settings.preferredLanguages = [{ youdaoLangCode: "fr" }];
    local.resolve({
      kind: "ranked",
      type: LanguageDetectType.Franc,
      candidates: [
        { language: "fr", confidence: 1 },
        { language: "en", confidence: 0.4 },
      ],
    });
    expect(await result).toEqual({ type: LanguageDetectType.Franc, language: "en", confirmed: false });
  });

  it("accepts the first preferred remote language when speed-first is enabled", async () => {
    doubles.settings.enableDetectLanguageSpeedFirst = true;
    const pending = deferred<DetectionObservation>();
    doubles.services.push(
      service(LanguageDetectType.Bing, async () => observed(LanguageDetectType.Bing, "en")),
      service(LanguageDetectType.Tencent, () => pending.promise),
    );
    expect(await detectLanguage("english")).toEqual({ type: LanguageDetectType.Bing, language: "en", confirmed: true });
    pending.resolve(observed(LanguageDetectType.Tencent, "ja"));
  });

  it("preserves provider confidence when conflicting remote results fall back to the first mapped observation", async () => {
    doubles.services.push(
      service(LanguageDetectType.Volcano, async () => ({
        kind: "single",
        type: LanguageDetectType.Volcano,
        language: "fr",
        confidence: 0.7,
      })),
      service(LanguageDetectType.Tencent, async () => observed(LanguageDetectType.Tencent, "ja")),
    );
    expect(await detectLanguage("bonjour")).toEqual({
      type: LanguageDetectType.Volcano,
      language: "fr",
      confirmed: true,
    });
  });

  it.each([
    { confidence: 0.9, expected: "en", confirmed: true },
    { confidence: 0.4, expected: "en", confirmed: false },
    { confidence: 0.1, expected: "fr", confirmed: false },
  ])("uses ranked local candidates at confidence $confidence", async ({ confidence, expected, confirmed }) => {
    doubles.services.push(
      service(
        LanguageDetectType.Franc,
        async () => ({
          kind: "ranked",
          type: LanguageDetectType.Franc,
          candidates: [
            { language: "fr", confidence: 1 },
            { language: "en", confidence },
          ],
        }),
        true,
      ),
    );
    expect(await detectLanguage("a local sentence")).toEqual({
      type: LanguageDetectType.Franc,
      language: expected,
      confirmed,
    });
  });

  it("makes an explicit unconfirmed auto decision for an unmapped remote code", async () => {
    doubles.services.push(service(LanguageDetectType.Bing, async () => observed(LanguageDetectType.Bing, undefined)));
    expect(await detectLanguage("unknown")).toEqual({
      type: LanguageDetectType.Bing,
      language: "auto",
      confirmed: false,
    });
  });

  it.each([
    ["hello!", "en"],
    ["中文", "zh-CHS"],
    ["こんにちは", "auto"],
  ])("uses the existing simple fallback for %s", async (text, language) => {
    expect(await detectLanguage(text)).toEqual({ type: LanguageDetectType.Simple, language, confirmed: false });
  });

  it("does not promote the simplified-Chinese fallback when only traditional Chinese is preferred", async () => {
    doubles.settings.preferredLanguages = [{ youdaoLangCode: "zh-CHT" }];
    expect(await detectLanguage("中文")).toEqual({
      type: LanguageDetectType.Simple,
      language: "auto",
      confirmed: false,
    });
  });

  it("does not run local fallback after the caller cancels remote detection", async () => {
    const remote = deferred<DetectionObservation>();
    const local = vi.fn(async (): Promise<DetectionObservation> => ({
      kind: "ranked",
      type: LanguageDetectType.Franc,
      candidates: [],
    }));
    doubles.services.push(
      service(LanguageDetectType.Bing, () => remote.promise),
      service(LanguageDetectType.Franc, local, true),
    );
    const controller = new AbortController();
    const result = detectLanguage("text", controller.signal);
    controller.abort();
    await expect(result).rejects.toBeInstanceOf(CancelledError);
    remote.resolve(observed(LanguageDetectType.Bing, "en"));
    expect(local).not.toHaveBeenCalled();
  });
});
