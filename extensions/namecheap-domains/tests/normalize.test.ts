import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidates,
  DEFAULT_TLDS,
  isValidDomain,
  normalizeInput,
  parseTldList,
  splitDomain,
} from "../src/domain/normalize";

describe("normalizeInput", () => {
  it("lowercases and trims", () => assert.equal(normalizeInput("  Acme.COM "), "acme.com"));
  it("strips scheme, path, query and port", () => {
    assert.equal(normalizeInput("https://www.acme.com/path?x=1#frag"), "www.acme.com");
    assert.equal(normalizeInput("acme.com:8080"), "acme.com");
    assert.equal(normalizeInput("user@acme.com"), "acme.com");
  });
  it("removes surrounding dots and inner whitespace", () => {
    assert.equal(normalizeInput(".acme.com."), "acme.com");
    assert.equal(normalizeInput("ac me"), "acme");
  });
  it("converts IDNs to punycode", () => assert.equal(normalizeInput("münchen.de"), "xn--mnchen-3ya.de"));
  it("returns an empty string for empty input", () => assert.equal(normalizeInput("   "), ""));
});

describe("isValidDomain", () => {
  it("accepts ordinary and multi-level domains", () => {
    assert.equal(isValidDomain("acme.com"), true);
    assert.equal(isValidDomain("shop.co.uk"), true);
    assert.equal(isValidDomain("xn--mnchen-3ya.de"), true);
    assert.equal(isValidDomain("a.xn--p1ai"), true);
  });
  it("rejects invalid labels", () => {
    assert.equal(isValidDomain("acme"), false);
    assert.equal(isValidDomain("-acme.com"), false);
    assert.equal(isValidDomain("acme-.com"), false);
    assert.equal(isValidDomain("acme..com"), false);
    assert.equal(isValidDomain("acme.c"), false);
    assert.equal(isValidDomain("acme.123"), false);
    assert.equal(isValidDomain(`${"a".repeat(64)}.com`), false);
  });
});

describe("parseTldList", () => {
  it("splits on commas and whitespace, strips dots, dedupes", () => {
    assert.deepEqual(parseTldList("com, .io  net;com"), ["com", "io", "net"]);
  });
  it("falls back to the defaults", () => {
    assert.deepEqual(parseTldList(""), DEFAULT_TLDS);
    assert.deepEqual(parseTldList(" , "), DEFAULT_TLDS);
  });
});

describe("buildCandidates", () => {
  it("expands a keyword across the default TLDs", () => {
    const result = buildCandidates("Acme", ["com", "io"]);
    assert.equal(result.mode, "keyword");
    assert.deepEqual(result.candidates, ["acme.com", "acme.io"]);
  });
  it("checks a full domain exactly", () => {
    const result = buildCandidates("acme.dev", ["com"]);
    assert.equal(result.mode, "domain");
    assert.deepEqual(result.candidates, ["acme.dev"]);
  });
  it("flags invalid input", () => {
    assert.equal(buildCandidates("acme..com").mode, "invalid");
    assert.equal(buildCandidates("-acme").mode, "invalid");
    assert.equal(buildCandidates("").mode, "empty");
  });
  it("caps the number of candidates", () => {
    const letters = "abcdefghij";
    const tlds = Array.from({ length: 60 }, (_, index) => `t${letters[Math.floor(index / 10)]}${letters[index % 10]}`);
    assert.equal(new Set(tlds).size, 60);
    assert.equal(buildCandidates("acme", tlds).candidates.length, 50);
  });

  it("drops TLDs that cannot be registered", () => {
    assert.deepEqual(buildCandidates("acme", ["com", "123", "-bad"]).candidates, ["acme.com"]);
  });
});

describe("splitDomain", () => {
  it("uses the last label by default", () => assert.deepEqual(splitDomain("shop.co.uk"), { sld: "shop.co", tld: "uk" }));
  it("prefers the longest known suffix", () => {
    assert.deepEqual(splitDomain("shop.co.uk", ["uk", "co.uk", "com"]), { sld: "shop", tld: "co.uk" });
    assert.deepEqual(splitDomain("acme.com", ["co.uk", "com"]), { sld: "acme", tld: "com" });
  });
});
