import { describe, it, expect } from "vitest";
import { exists, getOpenWindowIds, shellEscape } from "./utils";
import path from "path";

describe("shellEscape", () => {
  it("should wrap simple strings in single quotes", () => {
    expect(shellEscape("hello")).toBe("'hello'");
    expect(shellEscape("world")).toBe("'world'");
  });

  it("should handle strings with spaces", () => {
    expect(shellEscape("hello world")).toBe("'hello world'");
    expect(shellEscape("path/to/my file.txt")).toBe("'path/to/my file.txt'");
  });

  it("should escape single quotes within strings", () => {
    expect(shellEscape("it's")).toBe("'it'\\''s'");
    expect(shellEscape("don't stop")).toBe("'don'\\''t stop'");
  });

  it("should handle multiple single quotes", () => {
    expect(shellEscape("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
  });

  it("should handle empty strings", () => {
    expect(shellEscape("")).toBe("''");
  });

  it("should not escape double quotes (they're safe in single quotes)", () => {
    expect(shellEscape('"quoted"')).toBe("'\"quoted\"'");
  });

  it("should handle paths with special characters", () => {
    expect(shellEscape("/Users/test/My Documents")).toBe("'/Users/test/My Documents'");
    expect(shellEscape("/path/with$dollar")).toBe("'/path/with$dollar'");
    expect(shellEscape("/path/with`backtick`")).toBe("'/path/with`backtick`'");
  });

  it("should handle unicode characters", () => {
    expect(shellEscape("/Users/test/日本語")).toBe("'/Users/test/日本語'");
    expect(shellEscape("emoji-folder-🚀")).toBe("'emoji-folder-🚀'");
  });
});

describe("getOpenWindowIds", () => {
  it("should extract session and window IDs from a valid DB", () => {
    const dbPath = path.resolve(__dirname, "../../test/fixtures/gram-db-v30.sqlite");

    // This assumes your sample data script inserted these keys into kv_store
    const result = getOpenWindowIds(dbPath);

    expect(result.sessionId).toBeDefined();
    expect(result.windowIds).toBeInstanceOf(Set);
  });
});

describe("exists", () => {
  it("should return true for an existing file path", () => {
    const dbPath = path.resolve(__dirname, "../../test/fixtures/gram-db-v30.sqlite");
    expect(exists(dbPath)).toBe(true);
  });

  it("should return false for a non-existent path", () => {
    expect(exists("/tmp/this-file-definitely-does-not-exist-12345")).toBe(false);
  });

  it("should handle file:// URLs", () => {
    const dbPath = path.resolve(__dirname, "../../test/fixtures/gram-db-v30.sqlite");
    const fileUrl = `file://${dbPath}`;
    expect(exists(fileUrl)).toBe(true);
  });
});
