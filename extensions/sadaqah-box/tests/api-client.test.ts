import { afterEach, describe, expect, mock, test } from "bun:test";
import { ApiError } from "../src/utils/error-handler";

let mockPreferences = {
  apiHost: "https://sadaqahbox.apps.erklab.com/",
  apiKey: "test-api-key",
};

mock.module("@raycast/api", () => ({
  getPreferenceValues: () => mockPreferences,
  Cache: class {},
  LocalStorage: {},
}));

const { getApiHost, getApiKey, get, post } = await import("../src/api/client");

describe("api client", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockPreferences = {
      apiHost: "https://sadaqahbox.apps.erklab.com/",
      apiKey: "test-api-key",
    };
  });

  test("validates and normalizes apiHost and apiKey", () => {
    expect(getApiHost()).toBe("https://sadaqahbox.apps.erklab.com");
    expect(getApiKey()).toBe("test-api-key");

    mockPreferences.apiHost = "ftp://invalid.example.com";
    expect(() => getApiHost()).toThrow("Invalid API Host URL format");

    mockPreferences.apiKey = "   ";
    expect(() => getApiKey()).toThrow("API Key is not configured");
  });

  test("retries transient 503 errors on GET but does not retry POST", async () => {
    let getCalls = 0;
    globalThis.fetch = (async () => {
      getCalls++;
      if (getCalls === 1) {
        return new Response(JSON.stringify({ success: false, error: "Busy" }), { status: 503 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof fetch;

    const res = await get<{ success: boolean }>("/api/boxes");
    expect(res.success).toBe(true);
    expect(getCalls).toBe(2);

    let postCalls = 0;
    globalThis.fetch = (async () => {
      postCalls++;
      return new Response(JSON.stringify({ success: false, error: "Server busy" }), { status: 503 });
    }) as typeof fetch;

    await expect(post("/api/boxes", { name: "Test" })).rejects.toBeInstanceOf(ApiError);
    expect(postCalls).toBe(1);
  });
});
