import { describe, expect, it, vi } from "vitest";

import {
  fingerprintApiKey,
  OPENROUTER_AUTH_KEY_URL,
  validateOpenRouterApiKeyIfChanged,
} from "../src/verify-api-key";

const localStorage = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => localStorage.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      localStorage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      localStorage.delete(key);
    }),
  },
}));

describe("fingerprintApiKey", () => {
  it("returns a stable hash for the same key", () => {
    expect(fingerprintApiKey(" sk-or-test ")).toBe(fingerprintApiKey("sk-or-test"));
  });
});

describe("validateOpenRouterApiKeyIfChanged", () => {
  it("returns missing for an empty key", async () => {
    await expect(validateOpenRouterApiKeyIfChanged("   ")).resolves.toEqual({ status: "missing" });
  });

  it("validates changed keys against the auth endpoint", async () => {
    localStorage.clear();

    const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));

    await expect(
      validateOpenRouterApiKeyIfChanged("sk-or-test", fetchImplementation as unknown as typeof fetch),
    ).resolves.toEqual({ status: "valid", skipped: false });

    expect(fetchImplementation).toHaveBeenCalledWith(OPENROUTER_AUTH_KEY_URL, {
      headers: {
        Authorization: "Bearer sk-or-test",
        "Content-Type": "application/json",
        "X-Title": "Extract Screenshot Text",
      },
    });
  });

  it("skips network calls when the key was already validated", async () => {
    localStorage.clear();
    const fingerprint = fingerprintApiKey("sk-or-test");
    localStorage.set("openRouterApiKeyFingerprint", fingerprint);

    const fetchImplementation = vi.fn();

    await expect(
      validateOpenRouterApiKeyIfChanged("sk-or-test", fetchImplementation as unknown as typeof fetch),
    ).resolves.toEqual({ status: "valid", skipped: true });

    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("returns invalid when OpenRouter rejects the key", async () => {
    localStorage.clear();

    const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Invalid" } }), { status: 401 }));

    await expect(
      validateOpenRouterApiKeyIfChanged("sk-or-bad", fetchImplementation as unknown as typeof fetch),
    ).resolves.toEqual({
      status: "invalid",
      message: "OpenRouter didn't accept your API key. Check it in extension preferences.",
    });
  });
});
