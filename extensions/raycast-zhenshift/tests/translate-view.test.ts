import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({}));

import { buildViewState } from "../src/translate";

describe("buildViewState", () => {
  it("空输入时应显示待输入", () => {
    expect(
      buildViewState({
        text: "",
        loading: false,
        error: null,
        configError: null,
        directionLabel: "",
        translation: "",
      }).statusTitle,
    ).toBe("待输入");
  });

  it("加载时应显示翻译中", () => {
    expect(
      buildViewState({
        text: "hello",
        loading: true,
        error: null,
        configError: null,
        directionLabel: "",
        translation: "",
      }).statusTitle,
    ).toBe("翻译中");
  });

  it("错误时应显示翻译失败", () => {
    expect(
      buildViewState({
        text: "hello",
        loading: false,
        error: "请求失败",
        configError: null,
        directionLabel: "",
        translation: "",
      }).statusTitle,
    ).toBe("翻译失败");
  });

  it("成功时应显示翻译成功", () => {
    expect(
      buildViewState({
        text: "hello",
        loading: false,
        error: null,
        configError: null,
        directionLabel: "English -> 中文",
        translation: "你好",
      }).statusTitle,
    ).toBe("翻译成功");
  });
});
