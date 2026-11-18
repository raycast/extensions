import crypto from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { BaiduTranslateProvider } from "./baidu";
import { CaiyunTranslateProvider } from "./caiyun";
import { DeepLTranslateProvider } from "./deepL";
import { TencentTranslateProvider } from "./tencent";
import { VolcanoTranslateProvider } from "./volcano";
import { YoudaoTranslateProvider } from "./youdao";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false, extensionName: "easydict" },
  getPreferenceValues: () => ({
    deepLAuthKey: "test:fx",
    deepLEndpoint: "",
    baiduAppId: "id",
    baiduAppSecret: "secret",
    tencentSecretId: "id",
    tencentSecretKey: "secret",
    volcanoAccessKeyId: "id",
    volcanoAccessKeySecret: "secret",
  }),
}));
vi.mock("@/shared/http", () => ({ timedFetch: mocks.fetch }));

const query = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };
const key = { secretKey: "secret", aesKey: "aes-key", aesIv: "aes-iv" };
const protocols = [
  {
    name: "Baidu",
    provider: () => new BaiduTranslateProvider(),
    valid: { trans_result: [{ dst: "一" }, { dst: "" }, { dst: "二" }] },
    invalid: { trans_result: [{ dst: 42 }] },
    paragraphs: ["一", "", "二"],
  },
  {
    name: "Caiyun",
    provider: () => new CaiyunTranslateProvider(),
    valid: { target: ["一", "", "二"] },
    invalid: { target: ["一", 42] },
    paragraphs: ["一", "", "二"],
  },
  {
    name: "DeepL",
    provider: () => new DeepLTranslateProvider(),
    valid: { translations: [{ text: "一\n\n二" }, { text: "ignored" }] },
    invalid: { translations: [{ text: 42 }] },
    paragraphs: ["一", "", "二"],
  },
  {
    name: "Tencent",
    provider: () => new TencentTranslateProvider(),
    valid: { Response: { TargetText: "一\n\n二" } },
    invalid: { Response: { TargetText: false } },
    paragraphs: ["一", "", "二"],
  },
  {
    name: "Volcano",
    provider: () => new VolcanoTranslateProvider(),
    valid: { TranslationList: [{ Translation: "一\n\n二" }] },
    invalid: { TranslationList: [{ Translation: 42 }] },
    paragraphs: ["一", "", "二"],
  },
];

beforeEach(() => mocks.fetch.mockReset());

describe("translation response boundaries", () => {
  it.each(protocols)(
    "$name preserves consumed text and paragraph order without retaining its response",
    async ({ provider, valid, paragraphs }) => {
      mocks.fetch.mockResolvedValue(valid);
      const instance = provider();
      const result = await instance.request(query).next();
      expect(result).toEqual({
        done: true,
        value: {
          type: instance.type,
          content: { kind: "translation", query, paragraphs },
        },
      });
    },
  );

  it.each(protocols)(
    "$name rejects a malformed consumed text field as a protocol error",
    async ({ provider, invalid }) => {
      mocks.fetch.mockResolvedValue(invalid);
      await expect(provider().request(query).next()).rejects.toMatchObject({
        name: "RequestError",
        code: "INVALID_RESPONSE",
      });
    },
  );

  it("keeps missing Tencent TargetText as an empty result", async () => {
    mocks.fetch.mockResolvedValue({ Response: {} });
    expect((await new TencentTranslateProvider().request(query).next()).value).toMatchObject({
      content: { paragraphs: [""] },
    });
  });

  it("preserves provider error envelopes and Baidu's success precedence", async () => {
    mocks.fetch.mockResolvedValueOnce({ trans_result: [{ dst: "success" }], error_code: "ignored" });
    expect((await new BaiduTranslateProvider().request(query).next()).value).toMatchObject({
      content: { paragraphs: ["success"] },
    });
    mocks.fetch.mockResolvedValueOnce({ error_msg: "quota", error_code: "54004" });
    await expect(new BaiduTranslateProvider().request(query).next()).rejects.toMatchObject({
      message: "quota",
      code: "54004",
    });
    mocks.fetch.mockResolvedValueOnce({ Response: { Error: { Message: "denied" } } });
    await expect(new TencentTranslateProvider().request(query).next()).rejects.toMatchObject({ message: "denied" });
    mocks.fetch.mockResolvedValueOnce({ ResponseMetadata: { Error: { Message: "quota", Code: "QuotaExceeded" } } });
    await expect(new VolcanoTranslateProvider().request(query).next()).rejects.toMatchObject({
      message: "quota",
      code: "QuotaExceeded",
    });
  });

  it("decrypts Youdao text and joins cells within each paragraph", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ code: 0, data: key })
      .mockResolvedValueOnce(encrypt({ translateResult: [[{ tgt: "一" }, { tgt: "二" }], [], [{ tgt: "三" }]] }));
    const result = await new YoudaoTranslateProvider().request(query).next();
    expect(result.value).toMatchObject({ content: { kind: "translation", query, paragraphs: ["一二", "", "三"] } });
    expect(result.value).not.toHaveProperty("result");
  });

  it("rejects malformed Youdao decrypted cells instead of coercing them into text", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ code: 0, data: key })
      .mockResolvedValueOnce(encrypt({ translateResult: [[{ tgt: 42 }]] }));
    await expect(new YoudaoTranslateProvider().request(query).next()).rejects.toMatchObject({
      name: "RequestError",
      code: "INVALID_RESPONSE",
    });
  });

  it("rejects an incomplete Youdao key before requesting encrypted translation", async () => {
    mocks.fetch.mockResolvedValue({ code: 0, data: { ...key, secretKey: "" } });
    await expect(new YoudaoTranslateProvider().request(query).next()).rejects.toMatchObject({
      name: "RequestError",
      code: "INVALID_RESPONSE",
    });
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
});

function encrypt(value: unknown): string {
  const digest = (text: string) => crypto.createHash("md5").update(text).digest();
  const cipher = crypto.createCipheriv("aes-128-cbc", digest(key.aesKey), digest(key.aesIv));
  return cipher.update(JSON.stringify(value), "utf8", "base64") + cipher.final("base64");
}
