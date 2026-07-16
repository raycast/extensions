import { describe, expect, it } from "vitest";
import { contractHome, expandHome, parsePathList, pathDepth } from "../../src/utils/path";

describe("expandHome", () => {
  const home = "/Users/tester";

  it("expands a lone tilde to the home directory", () => {
    expect(expandHome("~", home)).toBe(home);
  });

  it("expands ~/ prefixes", () => {
    expect(expandHome("~/code/app", home)).toBe("/Users/tester/code/app");
  });

  it("leaves absolute paths untouched (normalized)", () => {
    expect(expandHome("/var/www", home)).toBe("/var/www");
  });

  it("resolves relative paths against cwd", () => {
    expect(expandHome("relative", home)).toBe(`${process.cwd()}/relative`);
  });

  it("trims surrounding whitespace", () => {
    expect(expandHome("  ~/x  ", home)).toBe("/Users/tester/x");
  });
});

describe("contractHome", () => {
  const home = "/Users/tester";

  it("replaces the home prefix with a tilde", () => {
    expect(contractHome("/Users/tester/code/app", home)).toBe("~/code/app");
  });

  it("contracts the home directory itself", () => {
    expect(contractHome("/Users/tester", home)).toBe("~");
  });

  it("does not contract a sibling directory that merely shares a prefix", () => {
    expect(contractHome("/Users/tester2/x", home)).toBe("/Users/tester2/x");
  });
});

describe("pathDepth", () => {
  it("counts segments of an absolute path", () => {
    expect(pathDepth("/a/b/c")).toBe(3);
  });

  it("ignores a trailing slash", () => {
    expect(pathDepth("/a/b/")).toBe(2);
  });

  it("treats the root as depth 0", () => {
    expect(pathDepth("/")).toBe(0);
  });
});

describe("parsePathList", () => {
  it("splits on commas and newlines and trims blanks", () => {
    expect(parsePathList("~/a, ~/b\n~/c\n\n")).toEqual(["~/a", "~/b", "~/c"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parsePathList("   \n  ")).toEqual([]);
  });
});
