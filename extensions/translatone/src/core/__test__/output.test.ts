import { describe, expect, test } from "bun:test";
import { ProviderError } from "../errors";
import { confirmationMessage, outputActions, resolvePrimaryAction } from "../output";

describe("resolvePrimaryAction", () => {
  test.each([
    ["paste", "paste"],
    ["copy", "copy"],
    ["shout", "paste"],
    [undefined, "paste"],
  ] as const)("resolves %p to %p", (value, expected) => {
    expect(resolvePrimaryAction(value)).toBe(expected);
  });
});

describe("outputActions", () => {
  test.each([
    ["paste", ["paste", "copy"]],
    ["copy", ["copy", "paste"]],
  ] as const)("puts %s first", (primary, order) => {
    expect(outputActions(primary)).toEqual(order);
  });
});

describe("confirmationMessage", () => {
  test.each([
    ["paste", "Pasted · via Groq"],
    ["copy", "Copied · via Groq"],
    ["replace", "Replaced selection · via Groq"],
  ] as const)("confirms a %s", (kind, message) => {
    expect(confirmationMessage(kind, { providerId: "groq", skipped: [] })).toBe(message);
  });

  test("mentions the first provider that was skipped", () => {
    const skipped = [
      new ProviderError("groq", "rate_limited", "slow down"),
      new ProviderError("ollama", "network", "offline"),
    ];

    expect(confirmationMessage("paste", { providerId: "gemini", skipped })).toBe(
      "Pasted · via Gemini · Groq: rate limit reached",
    );
  });
});
