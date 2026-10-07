import { strict as assert } from "node:assert";
import { describe as group, it } from "node:test";
import {
  contains,
  describe,
  formatIPv6,
  nextSubnet,
  parseSubnet,
  previousSubnet,
  splitInTwo,
  supernet,
  toCidr,
} from "../src/lib/ip.ts";

const info = (text: string) => {
  const result = describe(text);
  assert.ok(result, `expected ${text} to parse`);
  return result;
};

group("IPv4", () => {
  it("breaks down the example from the brief", () => {
    const net = info("10.0.0.0/16");
    assert.equal(net.networkText, "10.0.0.0");
    assert.equal(net.lastText, "10.0.255.255");
    assert.equal(net.prefix, 16);
    assert.equal(net.size, 65536n);
    assert.equal(net.netmask, "255.255.0.0");
  });

  it("splits in two and finds the next block", () => {
    const net = info("10.0.0.0/16");
    const halves = splitInTwo(net);
    assert.deepEqual(halves?.map(toCidr), ["10.0.0.0/17", "10.0.128.0/17"]);
    assert.equal(toCidr(nextSubnet(net)!), "10.1.0.0/16");
    assert.equal(toCidr(previousSubnet(net)!), "9.255.0.0/16");
    assert.equal(toCidr(supernet(net)!), "10.0.0.0/15");
  });

  it("normalises host bits", () => {
    const net = info("172.16.5.23/20");
    assert.equal(net.cidr, "172.16.0.0/20");
    assert.equal(net.hasHostBits, true);
    assert.equal(net.addressText, "172.16.5.23");
    assert.equal(net.lastText, "172.16.15.255");
  });

  it("accepts a dotted netmask and a bare address", () => {
    assert.equal(info("192.168.1.0/255.255.255.0").cidr, "192.168.1.0/24");
    assert.equal(info("192.168.1.5").cidr, "192.168.1.5/32");
    assert.equal(info("192.168.1.5").size, 1n);
  });

  it("handles the edges", () => {
    assert.equal(info("0.0.0.0/0").size, 4294967296n);
    assert.equal(info("0.0.0.0/0").lastText, "255.255.255.255");
    assert.equal(previousSubnet(info("0.0.0.0/8")), null);
    assert.equal(nextSubnet(info("255.0.0.0/8")), null);
    assert.equal(supernet(info("0.0.0.0/0")), null);
    assert.equal(splitInTwo(info("10.0.0.1/32")), null);
  });

  it("rejects junk", () => {
    for (const bad of ["", "10.0.0", "256.0.0.1", "10.0.0.0/33", "10.0.0.0/abc", "010.0.0.1", "hello"]) {
      assert.equal(parseSubnet(bad), null, `expected ${bad} to be rejected`);
    }
  });
});

group("IPv6", () => {
  it("breaks down a /32", () => {
    const net = info("2001:db8::/32");
    assert.equal(net.version, 6);
    assert.equal(net.networkText, "2001:db8::");
    assert.equal(net.lastText, "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff");
    assert.equal(net.size, 1n << 96n);
    assert.equal(net.netmask, undefined);
  });

  it("splits and steps", () => {
    const net = info("2001:db8::/32");
    assert.deepEqual(splitInTwo(net)?.map(toCidr), ["2001:db8::/33", "2001:db8:8000::/33"]);
    assert.equal(toCidr(nextSubnet(net)!), "2001:db9::/32");
    assert.equal(toCidr(previousSubnet(net)!), "2001:db7::/32");
    assert.equal(toCidr(supernet(net)!), "2001:db8::/31");
  });

  it("round-trips compressed, expanded and IPv4-mapped forms", () => {
    assert.equal(info("::").cidr, "::/128");
    assert.equal(info("::1").cidr, "::1/128");
    assert.equal(info("fe80:0000:0000:0000:0000:0000:0000:0001").networkText, "fe80::1");
    assert.equal(info("::ffff:192.0.2.1").networkText, "::ffff:c000:201");
    assert.equal(info("2001:db8:0:0:1:0:0:1").networkText, "2001:db8::1:0:0:1");
    assert.equal(formatIPv6(0n), "::");
    assert.equal(info("2001:db8::%en0/64").cidr, "2001:db8::/64");
  });

  it("rejects junk", () => {
    for (const bad of ["2001:db8:::1", "2001:db8::/129", "12345::", "2001:db8::/255.255.0.0", ":::"]) {
      assert.equal(parseSubnet(bad), null, `expected ${bad} to be rejected`);
    }
  });
});

group("containment", () => {
  it("knows what is inside what", () => {
    assert.equal(contains(info("10.0.0.0/8"), info("10.1.2.0/24")), true);
    assert.equal(contains(info("10.1.2.0/24"), info("10.0.0.0/8")), false);
    assert.equal(contains(info("10.0.0.0/8"), info("2001:db8::/32")), false);
  });
});
