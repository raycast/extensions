import { describe, it, expect } from "vitest";
import { exists, getOpenWindowIds, shellEscape } from "./utils";
import path from "path";
import { isPosixShell } from "./shell";

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

describe("isPosixShell", () => {
  it("recognises common POSIX shells by absolute path", () => {
    expect(isPosixShell("/bin/sh")).toBe(true);
    expect(isPosixShell("/bin/bash")).toBe(true);
    expect(isPosixShell("/bin/zsh")).toBe(true);
    expect(isPosixShell("/bin/dash")).toBe(true);
    expect(isPosixShell("/bin/ksh")).toBe(true);
    expect(isPosixShell("/bin/ash")).toBe(true);
  });

  it("recognises POSIX shells installed in non-standard locations", () => {
    expect(isPosixShell("/usr/local/bin/bash")).toBe(true);
    expect(isPosixShell("/opt/homebrew/bin/zsh")).toBe(true);
  });

  it("rejects non-POSIX shells", () => {
    expect(isPosixShell("/usr/local/bin/fish")).toBe(false);
    expect(isPosixShell("/opt/homebrew/bin/fish")).toBe(false);
    expect(isPosixShell("/opt/homebrew/bin/nu")).toBe(false);
    expect(isPosixShell("/usr/local/bin/elvish")).toBe(false);
    expect(isPosixShell("/opt/homebrew/bin/xonsh")).toBe(false);
    expect(isPosixShell("/usr/local/bin/pwsh")).toBe(false);
  });

  it("matches on the basename, not substring of the path", () => {
    expect(isPosixShell("/opt/catfish/bin/nu")).toBe(false);
    expect(isPosixShell("/opt/bash-experiments/bin/fish")).toBe(false);
  });

  it("treats unknown or empty shells as non-POSIX", () => {
    expect(isPosixShell("")).toBe(false);
    expect(isPosixShell("/some/unknown/shell")).toBe(false);
  });
});
