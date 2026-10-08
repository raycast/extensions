import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { exists, shellEscape } from "./utils";
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

describe("exists", () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "gram-exists-"));
    filePath = path.join(tempDir, "existing-file");
    writeFileSync(filePath, "test");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return true for an existing file path", () => {
    expect(exists(filePath)).toBe(true);
  });

  it("should return false for a non-existent path", () => {
    expect(exists(path.join(tempDir, "missing-file"))).toBe(false);
  });

  it("should handle file:// URLs", () => {
    expect(exists(pathToFileURL(filePath).href)).toBe(true);
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
