import { homedir } from "os";
import { describe, it, expect } from "vitest";
import { extractAbsPath } from "./extractAbsPath";

describe("extractAbsPath (EXT-06)", () => {
  it("extracts /Users/... absolute path", () => {
    const result = extractAbsPath("open /Users/tim/Documents/notes.md now");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "/Users/tim/Documents/notes.md",
      url: "/Users/tim/Documents/notes.md",
      type: "local-path",
    });
  });

  it("expands ~/ to homedir in url field, keeps raw", () => {
    const result = extractAbsPath("see ~/Documents/foo.md ok");
    expect(result[0].raw).toBe("~/Documents/foo.md");
    expect(result[0].url).toBe(`${homedir()}/Documents/foo.md`);
  });

  it("does not match the path portion of an http URL", () => {
    expect(extractAbsPath("http://host/path/to/foo")).toEqual([]);
  });

  it("does not match the path portion of a file:// URI", () => {
    expect(extractAbsPath("file:///tmp/foo")).toEqual([]);
  });

  it("captures index", () => {
    const result = extractAbsPath("xx /Users/tim/a");
    expect(result[0].index).toBe(3);
  });

  it("strips trailing punctuation", () => {
    const result = extractAbsPath("see /tmp/foo.md.");
    expect(result[0].raw).toBe("/tmp/foo.md");
  });
});
