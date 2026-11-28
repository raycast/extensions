import { describe, expect, it } from "vitest";
import { readCachedChoice, viewPrefs } from "../src/core/ui/view-prefs";

type Mode = "detail" | "overview";
const isMode = (value: string): value is Mode => value === "detail" || value === "overview";

describe("readCachedChoice", () => {
  it("没存过时返回默认值", () => {
    expect(readCachedChoice("test:never", isMode, "overview")).toBe("overview");
  });

  it("返回记住的合法值", () => {
    viewPrefs.set("test:mode", "detail");
    expect(readCachedChoice("test:mode", isMode, "overview")).toBe("detail");
  });

  it("记住的值已不合法（如选项被移除）时回落默认值", () => {
    viewPrefs.set("test:mode", "grid");
    expect(readCachedChoice("test:mode", isMode, "overview")).toBe("overview");
  });
});
