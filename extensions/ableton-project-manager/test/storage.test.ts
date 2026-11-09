import { describe, expect, it } from "vitest";
import { isCorruptJson } from "../src/core/fs/storage";

describe("isCorruptJson", () => {
  it("从未存过（undefined）不算损坏", () => {
    expect(isCorruptJson(undefined)).toBe(false);
  });

  it("合法 JSON 不算损坏", () => {
    expect(isCorruptJson("{}")).toBe(false);
    expect(isCorruptJson('{"a":1}')).toBe(false);
    expect(isCorruptJson("[]")).toBe(false);
  });

  it("存在但无法解析算损坏", () => {
    expect(isCorruptJson("{oops")).toBe(true);
    expect(isCorruptJson("not json")).toBe(true);
  });
});
