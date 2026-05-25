import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { expandHomePath, normalizePathValue } from "./path-utils";

describe("domain/path-utils", () => {
  it("normalizePathValue は末尾の区切り文字を除去する", () => {
    expect(normalizePathValue(`foo${sep}${sep}`)).toBe("foo");
  });

  it("expandHomePath は先頭のチルダを homeDir に展開する", () => {
    expect(expandHomePath("~/repo", "/home/user")).toBe(join("/home/user", "repo"));
  });

  it("expandHomePath は homeDir が null のとき元の値を返す", () => {
    expect(expandHomePath("~/repo", null)).toBe("~/repo");
  });

  it("expandHomePath は homeDir が空文字のとき元の値を返す", () => {
    expect(expandHomePath("~/repo", "")).toBe("~/repo");
  });
});
