import { describe, expect, it } from "vitest";
import {
  getKeyLengthHint,
  getPasswordFieldInfo,
  supportsRandomIV,
  validateInputValue,
  validateKeyLength,
  wrapEncryptedValue,
} from "../../src/utils";

describe("supportsRandomIV", () => {
  it("returns false for ECB", () => {
    expect(supportsRandomIV("ECB")).toBe(false);
  });

  it("returns true for modes that use an IV", () => {
    expect(supportsRandomIV("CBC")).toBe(true);
    expect(supportsRandomIV("CFB")).toBe(true);
  });
});

describe("validateKeyLength", () => {
  it("accepts valid AES key lengths", () => {
    expect(validateKeyLength("AES", "1234567890123456")).toBeUndefined();
    expect(validateKeyLength("AES", "123456789012345678901234")).toBeUndefined();
    expect(validateKeyLength("AES", "12345678901234567890123456789012")).toBeUndefined();
  });

  it("rejects invalid AES key lengths", () => {
    expect(validateKeyLength("AES", "short")).toContain("16, 24, or 32");
  });

  it("validates DES and DESede fixed lengths", () => {
    expect(validateKeyLength("DES", "12345678")).toBeUndefined();
    expect(validateKeyLength("DES", "1234567")).toContain("8 characters");
    expect(validateKeyLength("DESede", "123456789012345678901234")).toBeUndefined();
  });

  it("skips fixed-length checks for Blowfish", () => {
    expect(validateKeyLength("Blowfish", "any-key")).toBeUndefined();
  });
});

describe("validateInputValue", () => {
  it("rejects the unsupported hash character", () => {
    expect(validateInputValue("abc#def")).toContain("#");
  });

  it("accepts normal values", () => {
    expect(validateInputValue("secret-value")).toBeUndefined();
  });
});

describe("wrapEncryptedValue", () => {
  it("wraps ciphertext for Mule configs", () => {
    expect(wrapEncryptedValue("abc==")).toBe("![abc==]");
  });
});

describe("getKeyLengthHint", () => {
  it("returns algorithm-specific guidance", () => {
    expect(getKeyLengthHint("AES")).toContain("16, 24, or 32");
  });
});

describe("getPasswordFieldInfo", () => {
  it("includes key-length guidance and preference prefill help", () => {
    expect(getPasswordFieldInfo("AES")).toContain("16, 24, or 32");
    expect(getPasswordFieldInfo("AES")).toContain("Extension Preferences");
  });
});
