import { describe, it, expect, beforeEach, vi } from "vitest";

// @raycast/api cannot load outside the Raycast runtime, so the single value
// preferences.ts reads from it is mocked here.
const mocks = vi.hoisted(() => ({ getPreferenceValues: vi.fn() }));
vi.mock("@raycast/api", () => ({ getPreferenceValues: mocks.getPreferenceValues }));

import { getBuzzConfig, getClient } from "./preferences";
import { BuzzClient } from "./buzz-client";

const HEX_KEY = "0000000000000000000000000000000000000000000000000000000000000001";

function setPreferences(relayUrl: string, privateKey: string) {
  mocks.getPreferenceValues.mockReturnValue({ relayUrl, privateKey });
}

beforeEach(() => mocks.getPreferenceValues.mockReset());

describe("getBuzzConfig", () => {
  it("returns the relay URL and the parsed 32-byte key", () => {
    setPreferences("https://relay.example.com", HEX_KEY);
    const config = getBuzzConfig();
    expect(config.relayUrl).toBe("https://relay.example.com");
    expect(config.secretKey).toBeInstanceOf(Uint8Array);
    expect(config.secretKey.length).toBe(32);
  });

  it("normalizes a wss:// relay URL to https://", () => {
    setPreferences("wss://relay.example.com", HEX_KEY);
    expect(getBuzzConfig().relayUrl).toBe("https://relay.example.com");
  });

  it("strips a trailing slash so the NIP-98 u tag matches the dialed URL", () => {
    setPreferences("https://relay.example.com/", HEX_KEY);
    expect(getBuzzConfig().relayUrl).toBe("https://relay.example.com");
  });

  it("rejects an empty relay URL", () => {
    setPreferences("", HEX_KEY);
    expect(() => getBuzzConfig()).toThrow(/relay URL/i);
  });

  it("rejects a relay URL with no scheme", () => {
    setPreferences("relay.example.com", HEX_KEY);
    expect(() => getBuzzConfig()).toThrow(/relay URL/i);
  });

  it("rejects a non-http scheme", () => {
    setPreferences("ftp://relay.example.com", HEX_KEY);
    expect(() => getBuzzConfig()).toThrow(/relay URL/i);
  });

  it("rejects preferences that were never filled in", () => {
    // Raycast returns undefined, not "", for an untouched required preference.
    mocks.getPreferenceValues.mockReturnValue({});
    expect(() => getBuzzConfig()).toThrow(/relay URL/i);
  });

  it("rejects a missing private key alongside a valid relay URL", () => {
    mocks.getPreferenceValues.mockReturnValue({ relayUrl: "https://relay.example.com" });
    expect(() => getBuzzConfig()).toThrow(/private key/i);
  });

  it("rejects a malformed private key", () => {
    setPreferences("https://relay.example.com", "not-a-key");
    expect(() => getBuzzConfig()).toThrow();
  });

  it("never echoes key material in the thrown error", () => {
    setPreferences("https://relay.example.com", "deadbeef");
    try {
      getBuzzConfig();
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).not.toContain("deadbeef");
    }
  });

  it("validates the relay URL before touching the key", () => {
    setPreferences("", "not-a-key");
    expect(() => getBuzzConfig()).toThrow(/relay URL/i);
  });
});

describe("getClient", () => {
  it("builds a BuzzClient from valid preferences", () => {
    setPreferences("wss://relay.example.com", HEX_KEY);
    expect(getClient()).toBeInstanceOf(BuzzClient);
  });

  it("propagates a configuration error instead of returning a client", () => {
    setPreferences("", HEX_KEY);
    expect(() => getClient()).toThrow(/relay URL/i);
  });
});
