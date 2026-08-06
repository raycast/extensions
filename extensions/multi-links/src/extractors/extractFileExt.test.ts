import { homedir } from "os";
import { describe, it, expect } from "vitest";
import { extractFileExt } from "./extractFileExt";

describe("extractFileExt (EXT-09)", () => {
  it("matches a relative path with allowlisted ext", () => {
    const result = extractFileExt("see docs/foo.md please");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "docs/foo.md",
      url: "docs/foo.md",
      type: "file-ext",
    });
  });

  it("matches ~/Downloads/file.zip with home expansion", () => {
    const result = extractFileExt("at ~/Downloads/file.zip ok");
    expect(result[0].raw).toBe("~/Downloads/file.zip");
    expect(result[0].url).toBe(`${homedir()}/Downloads/file.zip`);
  });

  it("matches /tmp/data.json", () => {
    const result = extractFileExt("/tmp/data.json here");
    expect(result[0].raw).toBe("/tmp/data.json");
    expect(result[0].type).toBe("file-ext");
  });

  it("does NOT match plain report.pdf (no slash)", () => {
    expect(extractFileExt("see report.pdf in folder")).toEqual([]);
  });

  it("does NOT match version 1.84", () => {
    expect(extractFileExt("update to version 1.84 now")).toEqual([]);
  });

  it("does NOT match non-allowlisted extensions like .xyz", () => {
    expect(extractFileExt("see /tmp/foo.xyz")).toEqual([]);
  });

  it("does NOT match path inside http URL", () => {
    expect(extractFileExt("http://host/path.md")).toEqual([]);
  });

  it("does NOT match email-like .md", () => {
    expect(extractFileExt("foo@bar.md")).toEqual([]);
  });

  it("matches multiple allowlisted exts", () => {
    const result = extractFileExt("a docs/x.md b ./y.png c /tmp/z.app");
    expect(result.map((i) => i.raw)).toEqual(["docs/x.md", "./y.png", "/tmp/z.app"]);
  });
});
