import { describe, it, expect } from "vitest";
import { normalizeRelayUrl } from "./relay-url";

describe("normalizeRelayUrl", () => {
  it("converts wss:// to https://", () => {
    expect(normalizeRelayUrl("wss://relay.example.com")).toBe("https://relay.example.com");
  });

  it("converts ws:// to http://", () => {
    expect(normalizeRelayUrl("ws://relay.example.com")).toBe("http://relay.example.com");
  });

  it("leaves https:// unchanged", () => {
    expect(normalizeRelayUrl("https://relay.example.com")).toBe("https://relay.example.com");
  });

  it("leaves http:// unchanged", () => {
    expect(normalizeRelayUrl("http://relay.example.com")).toBe("http://relay.example.com");
  });

  it("strips a trailing slash", () => {
    expect(normalizeRelayUrl("https://relay.example.com/")).toBe("https://relay.example.com");
  });

  it("strips multiple trailing slashes", () => {
    expect(normalizeRelayUrl("https://relay.example.com///")).toBe("https://relay.example.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeRelayUrl("  https://relay.example.com  ")).toBe("https://relay.example.com");
  });

  it("matches the scheme case-insensitively", () => {
    expect(normalizeRelayUrl("WSS://relay.example.com")).toBe("https://relay.example.com");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeRelayUrl("")).toBe("");
  });

  it("tolerates a missing value rather than throwing", () => {
    // Raycast hands back undefined for a preference that was never filled in.
    expect(normalizeRelayUrl(undefined as unknown as string)).toBe("");
  });

  it("leaves a path on the relay URL intact", () => {
    expect(normalizeRelayUrl("wss://relay.example.com/buzz/")).toBe("https://relay.example.com/buzz");
  });
});
