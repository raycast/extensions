import { describe, expect, it } from "vitest";
import { containsReplaceableCharacters, randomizePreservingShape } from "./randomize";

// Maps every character to its class so that two strings can be compared by shape only
function describeShape(value: string): string {
  return Array.from(value, (character) => {
    if (/[A-Z]/.test(character)) return "A";
    if (/[a-z]/.test(character)) return "a";
    if (/[0-9]/.test(character)) return "9";
    return character;
  }).join("");
}

describe("randomizePreservingShape", () => {
  it("keeps length and character classes of a password", () => {
    const password = "P@ssw0rd!Secure_42";
    const result = randomizePreservingShape(password);

    expect(result).toHaveLength(password.length);
    expect(describeShape(result)).toBe(describeShape(password));
    expect(result).not.toBe(password);
  });

  it("keeps separators of an email", () => {
    const result = randomizePreservingShape("john.doe@example.com");

    expect(result).toMatch(/^[a-z]{4}\.[a-z]{3}@[a-z]{7}\.[a-z]{3}$/);
  });

  it.each([
    ["sk-ant-", "sk-ant-api03-AbCdEf123456"],
    ["sk-", "sk-AbCdEf1234567890"],
    ["ghp_", "ghp_aB3xK9mQ2pL7zZ1yY0"],
    ["AKIA", "AKIAIOSFODNN7EXAMPLE"],
    ["eyJ", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc"],
  ])("keeps the known prefix %s", (prefix, token) => {
    const result = randomizePreservingShape(token);

    expect(result.startsWith(prefix)).toBe(true);
    expect(describeShape(result)).toBe(describeShape(token));
  });

  it("keeps a UUID valid lowercase hex", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = randomizePreservingShape(uuid);

    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result).not.toBe(uuid);
  });

  it("keeps an uppercase hex string uppercase hex", () => {
    const result = randomizePreservingShape("DEADBEEF0123456789ABCDEF");

    expect(result).toMatch(/^[0-9A-F]{24}$/);
  });

  it("treats short hex-looking words as regular text", () => {
    const result = randomizePreservingShape("cafe");

    expect(result).toMatch(/^[a-z]{4}$/);
  });

  it("keeps a mixed-case UUID valid hex with the same letter positions and case", () => {
    const uuid = "550E8400-e29b-41d4-A716-446655440000";
    const result = randomizePreservingShape(uuid);

    expect(result).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    expect(describeShape(result)).toBe(describeShape(uuid));
  });

  it("replaces Cyrillic letters with Cyrillic letters of the same case", () => {
    const result = randomizePreservingShape("Пароль 123");

    expect(result).toMatch(/^[А-ЯЁ][а-яё]{5} [0-9]{3}$/);
    expect(result).not.toBe("Пароль 123");
  });

  it("replaces letters and digits of other scripts with ASCII", () => {
    const result = randomizePreservingShape("Σοφία-٣٤");

    expect(result).toMatch(/^[A-Z][a-z]{4}-[0-9]{2}$/);
  });
});

describe("containsReplaceableCharacters", () => {
  it.each(["abc", "123", "пароль", "Σοφία"])("returns true for %s", (value) => {
    expect(containsReplaceableCharacters(value)).toBe(true);
  });

  it.each(["", "   ", "-_.@!"])("returns false for %j", (value) => {
    expect(containsReplaceableCharacters(value)).toBe(false);
  });
});
