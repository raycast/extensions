import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { browserUrl, pluralize, wellKnownPort } from "../src/core/ports";
import { listenersFrom, row } from "./fixtures";

describe("browserUrl", () => {
  it("uses localhost for wildcard and loopback bindings", () => {
    assert.equal(browserUrl(listenersFrom(row({ address: "*:3000" }))[0]), "http://localhost:3000");
    assert.equal(browserUrl(listenersFrom(row({ address: "127.0.0.1:8000" }))[0]), "http://localhost:8000");
  });

  it("falls back to the IPv6 loopback when the process bound IPv6 only", () => {
    const [listener] = listenersFrom(row({ ipVersion: "IPv6", address: "[::1]:8080" }));
    assert.equal(browserUrl(listener), "http://[::1]:8080");
  });

  // RFC 6874: the colons of an IPv6 literal stay literal inside the brackets and only the
  // zone separator is percent-encoded. Encoding the whole host yields a URL no browser opens.
  it("brackets an IPv6 literal and encodes only the zone separator", () => {
    const [listener] = listenersFrom(row({ ipVersion: "IPv6", address: "[fe80::1%en0]:9999" }));
    assert.equal(browserUrl(listener), "http://[fe80::1%25en0]:9999");
  });

  it("leaves a zoneless IPv6 literal untouched", () => {
    const [listener] = listenersFrom(row({ ipVersion: "IPv6", address: "[2001:db8::5]:8080" }));
    assert.equal(browserUrl(listener), "http://[2001:db8::5]:8080");
  });

  it("keeps a specific IPv4 interface address as typed", () => {
    const [listener] = listenersFrom(row({ address: "192.168.1.5:5000" }));
    assert.equal(browserUrl(listener), "http://192.168.1.5:5000");
  });

  it("switches to https on the TLS ports", () => {
    assert.equal(browserUrl(listenersFrom(row({ address: "*:443" }))[0]), "https://localhost:443");
    assert.equal(browserUrl(listenersFrom(row({ address: "*:8443" }))[0]), "https://localhost:8443");
  });

  it("only ever produces http or https", () => {
    for (const port of [22, 80, 443, 3000, 8443, 11434]) {
      const url = browserUrl(listenersFrom(row({ address: `*:${port}` }))[0]);
      assert.match(url, /^https?:\/\//);
    }
  });
});

describe("wellKnownPort", () => {
  it("names common ports and stays quiet about the rest", () => {
    assert.equal(wellKnownPort(5432), "PostgreSQL");
    assert.equal(wellKnownPort(6379), "Redis");
    assert.equal(wellKnownPort(54321), undefined);
  });
});

describe("pluralize", () => {
  it("agrees with the count", () => {
    assert.equal(pluralize(1, "listener"), "1 listener");
    assert.equal(pluralize(2, "listener"), "2 listeners");
    assert.equal(pluralize(0, "process", "processes"), "0 processes");
  });
});
