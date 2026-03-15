import { describe, it, expect } from "vitest";
import * as crypto from "node:crypto";
import { generatePKCE } from "../oauth";

describe("generatePKCE", () => {
  it("generates a verifier and challenge", () => {
    const { verifier, challenge } = generatePKCE();
    expect(verifier).toBeDefined();
    expect(challenge).toBeDefined();
    expect(typeof verifier).toBe("string");
    expect(typeof challenge).toBe("string");
  });

  it("generates a verifier of 86 characters (64 bytes base64url)", () => {
    const { verifier } = generatePKCE();
    // 64 bytes -> base64url = ceil(64 * 4/3) = 86 chars (no padding)
    expect(verifier.length).toBe(86);
  });

  it("generates a valid S256 challenge from the verifier", () => {
    const { verifier, challenge } = generatePKCE();
    const expected = crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");
    expect(challenge).toBe(expected);
  });

  it("generates unique values each time", () => {
    const first = generatePKCE();
    const second = generatePKCE();
    expect(first.verifier).not.toBe(second.verifier);
    expect(first.challenge).not.toBe(second.challenge);
  });

  it("generates URL-safe characters only", () => {
    const { verifier, challenge } = generatePKCE();
    const urlSafePattern = /^[A-Za-z0-9_-]+$/;
    expect(verifier).toMatch(urlSafePattern);
    expect(challenge).toMatch(urlSafePattern);
  });
});
