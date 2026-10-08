import {
  parseVaultedUrl,
  validateHost,
  validateLength,
  MAX_SECRET_LENGTH,
} from "../validation";
import { ValidationError } from "../errors";

describe("parseVaultedUrl", () => {
  it("parses a canonical vaulted.fyi URL", () => {
    const result = parseVaultedUrl("https://vaulted.fyi/s/abc123#deadbeef");
    expect(result).toEqual({
      origin: "https://vaulted.fyi",
      id: "abc123",
      fragment: "deadbeef",
    });
  });

  it("parses self-hosted https URLs", () => {
    const result = parseVaultedUrl(
      "https://secrets.example.com/s/xyz#key.salt",
    );
    expect(result.origin).toBe("https://secrets.example.com");
    expect(result.id).toBe("xyz");
    expect(result.fragment).toBe("key.salt");
  });

  it("parses http localhost URLs", () => {
    const result = parseVaultedUrl("http://localhost:3000/s/abc#k");
    expect(result.origin).toBe("http://localhost:3000");
  });

  it("trims surrounding whitespace", () => {
    const result = parseVaultedUrl("  https://vaulted.fyi/s/abc#k  ");
    expect(result.id).toBe("abc");
  });

  it("throws on missing fragment", () => {
    expect(() => parseVaultedUrl("https://vaulted.fyi/s/abc")).toThrow(
      ValidationError,
    );
  });

  it("throws on empty fragment", () => {
    expect(() => parseVaultedUrl("https://vaulted.fyi/s/abc#")).toThrow(
      ValidationError,
    );
  });

  it("throws on malformed path", () => {
    expect(() => parseVaultedUrl("https://vaulted.fyi/wrong/abc#k")).toThrow(
      ValidationError,
    );
  });

  it("throws on non-http(s) scheme", () => {
    expect(() => parseVaultedUrl("ftp://vaulted.fyi/s/abc#k")).toThrow(
      ValidationError,
    );
  });
});

describe("validateHost", () => {
  it("accepts https URLs", () => {
    expect(() => validateHost("https://vaulted.fyi")).not.toThrow();
  });

  it("accepts http://localhost", () => {
    expect(() => validateHost("http://localhost:3000")).not.toThrow();
  });

  it("accepts http://127.0.0.1", () => {
    expect(() => validateHost("http://127.0.0.1:3000")).not.toThrow();
  });

  it("rejects http for non-localhost", () => {
    expect(() => validateHost("http://vaulted.fyi")).toThrow(ValidationError);
  });

  it("rejects malformed URLs", () => {
    expect(() => validateHost("not a url")).toThrow(ValidationError);
  });
});

describe("validateLength", () => {
  it("accepts normal text", () => {
    expect(() => validateLength("hello")).not.toThrow();
  });

  it("accepts exactly MAX_SECRET_LENGTH chars", () => {
    expect(() => validateLength("x".repeat(MAX_SECRET_LENGTH))).not.toThrow();
  });

  it("rejects text over MAX_SECRET_LENGTH", () => {
    expect(() => validateLength("x".repeat(MAX_SECRET_LENGTH + 1))).toThrow(
      ValidationError,
    );
  });

  it("rejects empty text", () => {
    expect(() => validateLength("")).toThrow(ValidationError);
  });
});
