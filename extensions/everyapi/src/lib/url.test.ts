import { describe, expect, it } from "vitest";
import { apiBase, gatewayOrigin, relayBase } from "./url";

describe("gateway URL normalization", () => {
  it.each([
    [undefined, "https://api.everyapi.ai"],
    ["", "https://api.everyapi.ai"],
    [" https://gateway.example.com/ ", "https://gateway.example.com"],
    ["https://gateway.example.com/v1", "https://gateway.example.com"],
    ["https://gateway.example.com/v1/", "https://gateway.example.com"],
  ])("normalizes %s", (input, expected) => {
    expect(gatewayOrigin(input)).toBe(expected);
  });

  it("builds relay and API bases from one origin", () => {
    expect(relayBase("https://gateway.example.com/v1/")).toBe(
      "https://gateway.example.com/v1",
    );
    expect(apiBase("https://gateway.example.com/v1/")).toBe(
      "https://gateway.example.com/api",
    );
  });

  it.each([
    "ftp://gateway.example.com",
    "gateway.example.com",
    "https://gateway.example.com/api",
    "https://gateway.example.com/v1/chat/completions",
  ])("rejects unsupported gateway URL %s", (input) => {
    expect(() => gatewayOrigin(input)).toThrow("Gateway URL");
  });
});
