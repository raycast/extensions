import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCliCommand, shellQuote } from "../../src/utils";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shellQuote", () => {
  it("wraps values in single quotes", () => {
    expect(shellQuote("hello")).toBe("'hello'");
  });

  it("escapes embedded single quotes", () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });

  it("uses CMD-compatible double quotes on Windows", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    expect(shellQuote('say "hello"')).toBe('"say \\"hello\\""');
  });
});

describe("formatCliCommand", () => {
  it("builds a copyable java command with --use-random-iv", () => {
    const command = formatCliCommand({
      operation: "encrypt",
      input: "secret value",
      password: "my key",
      algorithm: "AES",
      mode: "CBC",
      useRandomIV: true,
    });

    expect(command).toContain("java -cp");
    expect(command).toContain("com.mulesoft.tools.SecurePropertiesTool");
    expect(command).toContain("'string' 'encrypt' 'AES' 'CBC' 'my key' 'secret value' --use-random-iv");
  });

  it("builds a Windows CMD-compatible command on Windows", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    const command = formatCliCommand({
      operation: "encrypt",
      input: "secret value",
      password: "my key",
      algorithm: "AES",
      mode: "CBC",
    });

    expect(command).toContain('"string" "encrypt" "AES" "CBC" "my key" "secret value"');
    expect(command).not.toContain("'string'");
  });
});
