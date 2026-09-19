import { describe, expect, it } from "vitest";
import { isNonIdentifyingIp } from "./ip";

describe("loopback spellings", () => {
  // `::1` has several forms and only the compact one used to be recognised, so
  // an expanded loopback address was masked out of debug output.
  it("recognises the expanded IPv6 loopback", () => {
    for (const value of [
      "::1",
      "0:0:0:0:0:0:0:1",
      "0000:0000:0000:0000:0000:0000:0000:0001",
    ]) {
      expect(isNonIdentifyingIp(value)).toBe(true);
    }
  });

  it("recognises the expanded unspecified address", () => {
    expect(isNonIdentifyingIp("0:0:0:0:0:0:0:0")).toBe(true);
  });

  it("still masks a routable IPv6 address", () => {
    expect(isNonIdentifyingIp("2001:db8::1")).toBe(false);
  });
});

describe("addresses with an embedded IPv4", () => {
  it("still exempts a link-local address written with a dotted quad", () => {
    expect(isNonIdentifyingIp("fe80::192.0.2.1")).toBe(true);
  });

  it("exempts IPv4-mapped loopback", () => {
    expect(isNonIdentifyingIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("still masks an IPv4-mapped routable address", () => {
    expect(isNonIdentifyingIp("::ffff:10.42.0.7")).toBe(false);
  });

  it("refuses a malformed quad rather than treating it as loopback", () => {
    expect(isNonIdentifyingIp("::ffff:999.0.0.1")).toBe(false);
  });
});
