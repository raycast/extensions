import { describe, expect, it } from "vitest";
import { searchRank } from "./helpers";

describe("searchRank", () => {
  const rank = (n: string, target: string, extra: { d?: string; a?: string[] } = {}) =>
    searchRank({ n, ...extra }, target);

  it("orders exact, prefix, word-start, contains, description-only", () => {
    expect(rank("dia", "dia")).toBe(0);
    expect(rank("diagnostics", "dia")).toBe(1);
    expect(rank("cool-dialpad", "dia")).toBe(2);
    expect(rank("airmedia", "dia")).toBe(3);
    expect(rank("fedora", "dia", { d: "media writer" })).toBe(4);
  });

  it("treats an alias match as exact", () => {
    expect(rank("python@3.13", "python3", { a: ["python3"] })).toBe(0);
  });
});
