import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

const localStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(async (key: string) => storage.get(key)),
  setItem: vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    storage.delete(key);
  }),
}));

vi.mock("@raycast/api", () => ({
  LocalStorage: localStorageMock,
}));

vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(() => "test-id"),
}));

import {
  clearHistory,
  getHistory,
  looksLikeUrl,
  parseWifi,
  sanitizeNetworkSetupError,
  saveToHistory,
} from "../src/utils";

describe("QR utility behavior", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation(async (key: string) => storage.get(key));
    localStorageMock.setItem.mockImplementation(async (key: string, value: string) => {
      storage.set(key, value);
    });
    localStorageMock.removeItem.mockImplementation(async (key: string) => {
      storage.delete(key);
    });
  });

  it("recognizes only http and https URLs", () => {
    expect(looksLikeUrl("https://example.com/path")).toBe(true);
    expect(looksLikeUrl("http://example.com/path")).toBe(true);
    expect(looksLikeUrl("javascript:alert(1)")).toBe(false);
    expect(looksLikeUrl("not a url")).toBe(false);
  });

  it("parses Wi-Fi QR data including escaped separators", () => {
    expect(parseWifi(String.raw`WIFI:T:WPA;S:semi\;colon;P:pa\:ss\,word;H:true;;`)).toEqual({
      ssid: "semi;colon",
      password: "pa:ss,word",
      security: "WPA",
      hidden: true,
    });
  });

  it("parses Wi-Fi QR values ending with a literal backslash", () => {
    expect(parseWifi(String.raw`WIFI:S:trailing\\;T:WPA;P:secret;;`)).toEqual({
      ssid: "trailing\\",
      password: "secret",
      security: "WPA",
      hidden: false,
    });
  });

  it("rejects Wi-Fi QR data without an SSID", () => {
    expect(parseWifi("WIFI:T:WPA;P:secret;;")).toBeNull();
  });

  it("does not persist Wi-Fi passwords in scan history", async () => {
    await saveToHistory("WIFI:T:WPA;S:Office;P:super-secret;H:true;;");

    const [entry] = await getHistory();
    expect(entry.type).toBe("wifi");
    expect(entry.data).toBe("WIFI:T:WPA;S:Office;H:true;;");
    expect(entry.data).not.toContain("super-secret");
    expect(entry.wifiNetwork?.password).toBe("");
  });

  it("recovers from corrupt history and clears stored history", async () => {
    storage.set("scan-history", "not-json");
    expect(await getHistory()).toEqual([]);

    await saveToHistory("plain text");
    expect(await getHistory()).toHaveLength(1);

    await clearHistory();
    expect(await getHistory()).toEqual([]);
  });

  it("drops malformed history entries and recovers from storage read failures", async () => {
    storage.set(
      "scan-history",
      JSON.stringify([
        { id: "ok", data: "https://example.com", type: "url", timestamp: 1 },
        { id: "bad", data: 123, type: "wifi", timestamp: "yesterday" },
      ]),
    );

    expect(await getHistory()).toEqual([
      { id: "ok", data: "https://example.com", type: "url", timestamp: 1 },
    ]);

    localStorageMock.getItem.mockRejectedValueOnce(new Error("storage unavailable"));
    expect(await getHistory()).toEqual([]);
  });

  it("redacts SSID and password from networksetup errors", () => {
    const message = sanitizeNetworkSetupError(
      new Error("Could not join Office with password super-secret"),
      { ssid: "Office", password: "super-secret", security: "WPA", hidden: false },
    );

    expect(message).toBe("Could not join [redacted] with password [redacted]");
  });
});
