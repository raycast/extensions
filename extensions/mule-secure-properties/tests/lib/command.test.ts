import { describe, expect, it } from "vitest";
import { formatCliCommand, shellQuote } from "../../src/utils";

describe("shellQuote", () => {
  it("wraps values in single quotes", () => {
    expect(shellQuote("hello")).toBe("'hello'");
  });

  it("escapes embedded single quotes", () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
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
});
