import { describe, expect, it } from "vitest";
import {
  countSubnets,
  formatPrefix,
  freeBlocks,
  overlaps,
  parsePrefix,
  parsePrefixLength,
  Prefix,
  randomSubnet,
} from "./ip";
import {
  COMMON_IPV4,
  COMMON_IPV6,
  IPV4_LENGTH,
  IPV6_LENGTH,
  PRIVATE_IPV4,
  PRIVATE_IPV6,
  SPECIAL_IPV4,
  SPECIAL_IPV6,
} from "./ranges";

const FAMILIES = [
  { name: "IPv4", pools: PRIVATE_IPV4, length: IPV4_LENGTH, avoid: [...SPECIAL_IPV4, ...COMMON_IPV4] },
  { name: "IPv6", pools: PRIVATE_IPV6, length: IPV6_LENGTH, avoid: [...SPECIAL_IPV6, ...COMMON_IPV6] },
];

describe("prefix notation", () => {
  it.each([
    "0.0.0.0/8",
    "192.0.0.170/32",
    "255.255.255.255/32",
    "::/128",
    "::1/128",
    "::ffff:0:0/96",
    "100:0:0:1::/64",
    "2001:db8::/32",
    "2620:4f:8000::/48",
    "fe80::/10",
  ])("round-trips %s", (cidr) => {
    expect(formatPrefix(parsePrefix(cidr))).toBe(cidr);
  });
});

describe("parsePrefixLength", () => {
  it.each([
    ["20", 20],
    ["/20", 20],
    [" /64 ", 64],
    ["", undefined],
    ["/", undefined],
    ["abc", undefined],
    ["20/", undefined],
    ["1234", undefined],
  ])("parses %j as %s", (text, length) => {
    expect(parsePrefixLength(text)).toBe(length);
  });
});

describe("overlaps", () => {
  it("detects containment", () => {
    expect(overlaps(parsePrefix("10.0.0.0/8"), parsePrefix("10.1.2.0/24"))).toBe(true);
  });

  it("rejects disjoint prefixes", () => {
    expect(overlaps(parsePrefix("10.0.0.0/8"), parsePrefix("11.0.0.0/24"))).toBe(false);
  });

  it("rejects different families", () => {
    expect(overlaps(parsePrefix("0.0.0.0/0"), parsePrefix("::/0"))).toBe(false);
  });
});

describe("freeBlocks", () => {
  it("removes excluded subnets", () => {
    const blocks = freeBlocks(parsePrefix("192.168.0.0/16"), 24, ["192.168.1.0/24", "192.168.0.0/23"].map(parsePrefix));
    expect(countSubnets(blocks)).toBe(254n);
  });

  it("removes a subnet partially covered by a longer prefix", () => {
    const blocks = freeBlocks(parsePrefix("192.168.0.0/16"), 24, [parsePrefix("192.168.7.128/25")]);
    expect(countSubnets(blocks)).toBe(255n);
  });

  it("clips exclusions larger than the pool", () => {
    expect(freeBlocks(parsePrefix("10.0.0.0/16"), 24, [parsePrefix("10.0.0.0/8")])).toEqual([]);
  });
});

describe("randomSubnet", () => {
  it("fails if every subnet is excluded", () => {
    expect(() => randomSubnet([parsePrefix("10.0.0.0/23")], 24, [parsePrefix("10.0.0.0/23")])).toThrow();
  });

  it.each([-1, 33, 1.5])("rejects /%s for IPv4", (length) => {
    expect(() => randomSubnet(PRIVATE_IPV4, length, [])).toThrow("not a valid IPv4 prefix length");
  });

  it("rejects lengths shorter than every pool", () => {
    expect(() => randomSubnet(PRIVATE_IPV4, 7, [])).toThrow("No /7 fits into");
  });

  it("uses only the pools that fit the length", () => {
    for (let i = 0; i < 100; i++) {
      const subnet = randomSubnet(PRIVATE_IPV4, 12, []);
      expect(overlaps(subnet, parsePrefix("192.168.0.0/16"))).toBe(false);
    }
  });

  it("reports a fully excluded pool", () => {
    const avoid = [...SPECIAL_IPV4, ...COMMON_IPV4];
    expect(() => randomSubnet([parsePrefix("192.168.0.0/16")], 17, avoid)).toThrow("Every /17 in 192.168.0.0/16");
  });

  it("picks the only free subnet", () => {
    const subnet = randomSubnet([parsePrefix("10.0.0.0/23")], 24, [parsePrefix("10.0.0.0/24")]);
    expect(formatPrefix(subnet)).toBe("10.0.1.0/24");
  });
});

describe.each(FAMILIES)("$name pools", ({ pools, length, avoid }) => {
  it.each(pools.map(formatPrefix))("%s is never fully excluded", (pool) => {
    expect(countSubnets(freeBlocks(parsePrefix(pool), length, avoid))).toBeGreaterThan(0n);
  });

  it("generates subnets inside the pools and outside the exclusions", () => {
    for (let i = 0; i < 1000; i++) {
      const subnet: Prefix = randomSubnet(pools, length, avoid);
      expect(subnet.length).toBe(length);
      expect(pools.some((pool) => overlaps(subnet, pool))).toBe(true);
      expect(avoid.filter((reserved) => overlaps(subnet, reserved)).map(formatPrefix)).toEqual([]);
    }
  });
});
