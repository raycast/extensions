import { describe, test, expect } from "bun:test";

import { generatePassword } from "./helpers";

describe("generatePassword", () => {
  const numbers = "23456789";
  const symbols = "!@#$*^&%";

  test("generates password of correct length", () => {
    const password = generatePassword(10, false, false);
    expect(password).toHaveLength(10);
  });

  test("generates password with only letters when both options are false", () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword(20, false, false);
      const hasNumbers = /[2-9]/.test(password);
      const hasSymbols = /[!@#$*^&%]/.test(password);

      expect(hasNumbers).toBe(false);
      expect(hasSymbols).toBe(false);
    }
  });

  test("guarantees at least one number when useNumbers is true", () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword(10, true, false);
      const hasNumber = numbers.split("").some((char) => password.includes(char));
      expect(hasNumber).toBe(true);
    }
  });

  test("guarantees at least one symbol when useChars is true", () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword(10, false, true);
      const hasSymbol = symbols.split("").some((char) => password.includes(char));
      expect(hasSymbol).toBe(true);
    }
  });

  test("guarantees at least one number AND one symbol when both options are true", () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword(10, true, true);
      const hasNumber = numbers.split("").some((char) => password.includes(char));
      const hasSymbol = symbols.split("").some((char) => password.includes(char));

      expect(hasNumber).toBe(true);
      expect(hasSymbol).toBe(true);
    }
  });

  test("works with minimum length when both options are enabled", () => {
    const password = generatePassword(2, true, true);
    expect(password).toHaveLength(2);

    const hasNumber = numbers.split("").some((char) => password.includes(char));
    const hasSymbol = symbols.split("").some((char) => password.includes(char));

    expect(hasNumber).toBe(true);
    expect(hasSymbol).toBe(true);
  });

  test("maintains randomness in character positions", () => {
    const passwords = Array.from({ length: 10 }, () => generatePassword(10, true, true));

    const firstCharacters = passwords.map((p) => p[0]);
    const uniqueFirstChars = new Set(firstCharacters);

    expect(uniqueFirstChars.size).toBeGreaterThan(1);
  });

  test("uses correct character sets", () => {
    const baseChars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

    const passwordWithNumbers = generatePassword(50, true, false);
    const passwordWithSymbols = generatePassword(50, false, true);
    const passwordWithBoth = generatePassword(50, true, true);

    for (const char of passwordWithNumbers) {
      expect(baseChars + numbers).toContain(char);
    }

    for (const char of passwordWithSymbols) {
      expect(baseChars + symbols).toContain(char);
    }

    for (const char of passwordWithBoth) {
      expect(baseChars + numbers + symbols).toContain(char);
    }
  });
});
