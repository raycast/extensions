import { describe, expect, it } from "vitest";
import { parseDomain } from "./index";

describe("parseDomain", () => {
  it("correctly identifies an IPv4 address", () => {
    const result = parseDomain("8.8.8.8");
    expect(result.isIp).toBe(true);
    expect(result.isDomain).toBe(false);
    expect(result.input).toBe("8.8.8.8");
  });

  it("correctly identifies a standard domain", () => {
    const result = parseDomain("raycast.com");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(true);
    expect(result.input).toBe("raycast.com");
  });

  it("correctly identifies a subdomain", () => {
    const result = parseDomain("docs.raycast.com");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(true);
    expect(result.input).toBe("docs.raycast.com");
  });

  it("handles empty strings", () => {
    const result = parseDomain("");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(false);
    expect(result.input).toBe("");
  });

  it("returns false for invalid inputs", () => {
    const result = parseDomain("not-a-domain-or-ip");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(false);
    expect(result.input).toBe("not-a-domain-or-ip");
  });
});
