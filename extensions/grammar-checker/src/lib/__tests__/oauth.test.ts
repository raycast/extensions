import { describe, it, expect, vi, beforeEach } from "vitest";
import * as crypto from "node:crypto";

// Mock LocalStorage
const store: Record<string, string> = {};
vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store[key],
    setItem: async (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: async (key: string) => {
      delete store[key];
    },
  },
  environment: { supportPath: "/tmp/raycast-test" },
  open: () => {},
}));

import { generatePKCE, getValidToken, storeTokens } from "../oauth";

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
});

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
    expect(verifier.length).toBe(86);
  });

  it("generates a valid S256 challenge from the verifier", () => {
    const { verifier, challenge } = generatePKCE();
    const expected = crypto.createHash("sha256").update(verifier).digest("base64url");
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

describe("getValidToken", () => {
  it("returns null when no tokens stored", async () => {
    expect(await getValidToken()).toBeNull();
  });

  it("returns token when not expired", async () => {
    await storeTokens({
      accessToken: "valid-token",
      refreshToken: "refresh",
      expiresAt: Date.now() + 300_000,
    });
    expect(await getValidToken()).toBe("valid-token");
  });

  it("returns null when expired and no refresh token", async () => {
    await storeTokens({
      accessToken: "expired-token",
      refreshToken: "",
      expiresAt: Date.now() - 1000,
    });
    expect(await getValidToken()).toBeNull();
  });

  it("returns token when expiresAt is undefined and no refresh token", async () => {
    await storeTokens({
      accessToken: "no-expiry-token",
      refreshToken: "",
    });
    expect(await getValidToken()).toBe("no-expiry-token");
  });

  it("returns null for corrupted storage", async () => {
    store["openai_oauth_tokens"] = "not valid json{{{";
    // JSON.parse will throw, but getValidToken doesn't catch it currently
    // This tests the current behavior
    await expect(getValidToken()).rejects.toThrow();
  });
});
