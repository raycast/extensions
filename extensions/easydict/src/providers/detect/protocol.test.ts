import { getPreferenceValues } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageDetectType } from "@/core/results/kinds";
import { requestBing } from "@/providers/shared/bing-request";
import { ProviderConfig } from "@/providers/shared/config";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";

import { BaiduDetectProvider } from "./baidu";
import { BingDetectProvider } from "./bing";
import { FrancDetectProvider } from "./franc";
import { createEnabledDetectors } from "./registry";
import { VolcanoDetectProvider } from "./volcano";

vi.mock("@raycast/api", () => ({
  environment: { extensionName: "easydict" },
  getPreferenceValues: vi.fn(() => ({})),
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("@/shared/http", () => ({ timedFetch: vi.fn() }));
vi.mock("@/providers/shared/bing-request", () => ({ requestBing: vi.fn() }));
vi.mock("@/providers/shared/volcano-sign", () => ({
  genVolcanoSign: () => ({ getUrl: () => "https://volcano.test", getConfig: () => ({ headers: {} }) }),
}));
vi.mock("@/shared/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logTrace: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

it.each([
  {
    baidu: false,
    volcano: false,
    secret: "secret",
    expected: [LanguageDetectType.Bing, LanguageDetectType.Franc],
  },
  {
    baidu: true,
    volcano: true,
    secret: "",
    expected: [LanguageDetectType.Bing, LanguageDetectType.Baidu, LanguageDetectType.Franc],
  },
  {
    baidu: true,
    volcano: true,
    secret: "secret",
    expected: [LanguageDetectType.Bing, LanguageDetectType.Baidu, LanguageDetectType.Volcano, LanguageDetectType.Franc],
  },
])(
  "uses enabled detectors in order with Baidu=$baidu, Volcano=$volcano and secret='$secret'",
  ({ baidu, volcano, secret, expected }) => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      enableBaiduLanguageDetect: baidu,
      enableVolcanoLanguageDetect: volcano,
    });
    ProviderConfig.volcanoSecretId = "id";
    ProviderConfig.volcanoSecretKey = secret;

    expect(createEnabledDetectors().map(({ type }) => type)).toEqual(expected);
  },
);

const protocols = [
  {
    name: "Bing",
    provider: BingDetectProvider,
    type: LanguageDetectType.Bing,
    response: [{ detectedLanguage: { language: "en" } }],
    malformed: [{ detectedLanguage: { language: 42 } }],
    unknown: [{ detectedLanguage: { language: "future-code" } }],
  },
  {
    name: "Baidu",
    provider: BaiduDetectProvider,
    type: LanguageDetectType.Baidu,
    response: { error: 0, lan: "en" },
    malformed: { error: 0, lan: 42 },
    unknown: { error: 0, lan: "future-code" },
  },
  {
    name: "Volcano",
    provider: VolcanoDetectProvider,
    type: LanguageDetectType.Volcano,
    response: { ResponseMetaData: {}, DetectedLanguageList: [{ Language: "en", Confidence: 0.9 }] },
    malformed: { ResponseMetaData: {}, DetectedLanguageList: [{ Language: "en", Confidence: "0.9" }] },
    unknown: { ResponseMetaData: {}, DetectedLanguageList: [{ Language: "future-code", Confidence: 0.9 }] },
  },
];

function respond(value: unknown) {
  vi.mocked(timedFetch).mockResolvedValueOnce(value);
  vi.mocked(requestBing).mockResolvedValueOnce({ url: "https://bing.test", data: value });
}

describe.each(protocols)("$name detection protocol", ({ provider: Provider, type, response, malformed, unknown }) => {
  it("decodes consumed fields without retaining the external payload", async () => {
    respond(response);
    const result = await new Provider().detect("hello");
    expect(result).toEqual({
      kind: "single",
      type,
      language: "en",
      ...(type === LanguageDetectType.Volcano ? { confidence: 0.9 } : {}),
    });
  });
  it("rejects malformed consumed fields as a normalized request error", async () => {
    respond(malformed);
    await expect(new Provider().detect("hello")).rejects.toBeInstanceOf(RequestError);
  });
  it("leaves an unknown provider code unmapped for the detection policy", async () => {
    respond(unknown);
    expect(await new Provider().detect("hello")).toMatchObject({ kind: "single", language: undefined });
  });
});

it("turns an empty Volcano language array into a protocol error", async () => {
  respond({ ResponseMetaData: {}, DetectedLanguageList: [] });
  await expect(new VolcanoDetectProvider().detect("hello")).rejects.toBeInstanceOf(RequestError);
});

it("returns ranked mapped observations from the real local detector without applying user preferences", async () => {
  const result = await new FrancDetectProvider().detect(
    "This is a sufficiently long English sentence for language detection.",
  );
  expect(result.kind).toBe("ranked");
  if (result.kind === "ranked") expect(result.candidates[0]).toEqual({ language: "en", confidence: 1 });
});
