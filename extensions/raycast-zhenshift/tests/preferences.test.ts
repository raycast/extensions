import { describe, expect, it } from "vitest";
import { normalizeBaseUrl, validatePreferences } from "../src/lib/preferences";
import { PreferenceValidationError } from "../src/lib/errors";

describe("preferences", () => {
  it("应移除 base url 末尾斜杠", () => {
    expect(normalizeBaseUrl("https://api.example.com/")).toBe("https://api.example.com");
  });

  it("缺少 base url 时应抛出配置错误", () => {
    expect(() =>
      validatePreferences({
        baseUrl: "",
        apiKey: "api-key",
        model: "gpt-4o-mini",
      }),
    ).toThrowError("缺少 Base URL");
  });

  it("缺少 api key 时应抛出配置错误", () => {
    expect(() =>
      validatePreferences({
        baseUrl: "https://api.example.com",
        apiKey: "",
        model: "gpt-4o-mini",
      }),
    ).toThrowError("缺少 API Key");
  });

  it("缺少 model 时应抛出配置错误", () => {
    expect(() =>
      validatePreferences({
        baseUrl: "https://api.example.com",
        apiKey: "api-key",
        model: "",
      }),
    ).toThrowError("缺少 Model");
  });

  it("字段未定义时仍应抛出配置错误", () => {
    expect(() =>
      validatePreferences({
        baseUrl: "https://api.example.com",
        apiKey: undefined,
        model: "gpt-4o-mini",
      }),
    ).toThrowError("缺少 API Key");
  });

  it("返回结果会清理斜杠与空白并保留有效值", () => {
    const result = validatePreferences({
      baseUrl: "https://api.example.com/",
      apiKey: "  api-key  ",
      model: "  gpt-4o-mini",
    });

    expect(result).toEqual({
      baseUrl: "https://api.example.com",
      apiKey: "api-key",
      model: "gpt-4o-mini",
    });
  });

  it("base url 只包含斜杠时仍应抛出配置错误", () => {
    expect(() =>
      validatePreferences({
        baseUrl: "///",
        apiKey: "api-key",
        model: "gpt-4o-mini",
      }),
    ).toThrow(PreferenceValidationError);
  });
});
