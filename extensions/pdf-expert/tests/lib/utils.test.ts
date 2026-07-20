import { describe, expect, it } from "vitest";
import { shortenPath } from "../../src/lib/utils";
import { homedir } from "os";

describe("shortenPath", () => {
  const home = homedir();

  it("replaces home directory with tilde", () => {
    expect(shortenPath(`${home}/Documents/test`)).toBe("~/Documents/test");
  });

  it("replaces home directory exactly at root", () => {
    expect(shortenPath(home)).toBe("~");
  });

  it("includes trailing slash separator in replacement", () => {
    expect(shortenPath(`${home}/Documents`)).toBe("~/Documents");
  });

  it("leaves non-home paths unchanged", () => {
    expect(shortenPath("/tmp/file.pdf")).toBe("/tmp/file.pdf");
  });

  it("does not replace partial home matches", () => {
    expect(shortenPath(`${home}2/Documents`)).toBe(`${home}2/Documents`);
  });

  it("handles deeply nested paths", () => {
    const deep = `${home}/a/b/c/d/e/f/g`;
    expect(shortenPath(deep)).toBe("~/a/b/c/d/e/f/g");
  });
});
