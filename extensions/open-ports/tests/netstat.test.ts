import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findHiddenListeners, parseNetstat, parseNetstatAddress } from "../src/core/netstat";
import { listenersFrom, row } from "./fixtures";

const NETSTAT = [
  "Active Internet connections (including servers)",
  "Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)",
  "tcp4       0      0  10.146.248.206.60710   13.67.9.5.443          ESTABLISHED",
  "tcp4       0      0  127.0.0.1.7265         *.*                    LISTEN",
  "tcp4       0      0  *.5000                 *.*                    LISTEN",
  "tcp6       0      0  *.5000                 *.*                    LISTEN",
  "tcp4       0      0  127.0.0.1.8021         *.*                    LISTEN",
  "tcp6       0      0  ::1.8021               *.*                    LISTEN",
].join("\n");

describe("parseNetstat", () => {
  it("keeps only listening TCP sockets", () => {
    const sockets = parseNetstat(NETSTAT);
    assert.equal(sockets.length, 5);
    assert.ok(sockets.every((socket) => socket.port > 0));
  });

  it("reads the protocol column as the IP version", () => {
    const sockets = parseNetstat(NETSTAT);
    assert.deepEqual(
      sockets.filter((socket) => socket.port === 5000).map((socket) => socket.ipVersion),
      ["IPv4", "IPv6"],
    );
  });

  it("ignores the header and established connections", () => {
    assert.equal(parseNetstat(NETSTAT).some((socket) => socket.port === 60710), false);
  });
});

describe("parseNetstatAddress", () => {
  it("splits the port off at the last dot", () => {
    assert.deepEqual(parseNetstatAddress("127.0.0.1.8021"), { host: "127.0.0.1", port: 8021 });
    assert.deepEqual(parseNetstatAddress("*.55964"), { host: "*", port: 55964 });
    assert.deepEqual(parseNetstatAddress("::1.8021"), { host: "::1", port: 8021 });
    assert.deepEqual(parseNetstatAddress("fe80::1%en0.9999"), { host: "fe80::1%en0", port: 9999 });
  });

  it("rejects malformed values", () => {
    assert.equal(parseNetstatAddress("*.*"), null);
    assert.equal(parseNetstatAddress("nodot"), null);
    assert.equal(parseNetstatAddress("127.0.0.1.70000"), null);
  });
});

describe("findHiddenListeners", () => {
  const sockets = parseNetstat(NETSTAT);

  it("reports the ports lsof could not attribute", () => {
    const listeners = listenersFrom(
      row({ command: "Raycast", pid: 871, address: "localhost:7265" }),
      row({ command: "ControlCenter", pid: 662, ipVersion: "IPv4", address: "*:5000" }),
      row({ command: "ControlCenter", pid: 662, ipVersion: "IPv6", fd: "13u", address: "*:5000" }),
    );

    const hidden = findHiddenListeners(sockets, listeners);
    assert.deepEqual(
      hidden.map((entry) => entry.port),
      [8021],
    );
  });

  // lsof prints `localhost:7265` while netstat prints `127.0.0.1.7265`; matching on the
  // host string would flag every loopback port as hidden.
  it("matches on port and IP version, not on the host spelling", () => {
    const listeners = listenersFrom(row({ command: "Raycast", address: "localhost:7265" }));
    assert.equal(
      findHiddenListeners(sockets, listeners).some((entry) => entry.port === 7265),
      false,
    );
  });

  it("merges the IPv4 and IPv6 sockets of one hidden port", () => {
    const [entry] = findHiddenListeners(sockets, []).filter((candidate) => candidate.port === 8021);

    assert.deepEqual(entry.ipVersions, ["IPv4", "IPv6"]);
    assert.deepEqual(entry.addresses, ["127.0.0.1:8021", "[::1]:8021"]);
    assert.equal(entry.exposure, "loopback");
  });

  it("flags a port as exposed when any of its hidden sockets is a wildcard", () => {
    const [entry] = findHiddenListeners(sockets, []).filter((candidate) => candidate.port === 5000);
    assert.equal(entry.exposure, "all-interfaces");
  });

  it("returns nothing when every socket is attributed", () => {
    const listeners = listenersFrom(
      row({ address: "localhost:7265" }),
      row({ pid: 2, ipVersion: "IPv4", address: "*:5000" }),
      row({ pid: 2, ipVersion: "IPv6", fd: "13u", address: "*:5000" }),
      row({ pid: 3, ipVersion: "IPv4", address: "127.0.0.1:8021" }),
      row({ pid: 3, ipVersion: "IPv6", fd: "14u", address: "[::1]:8021" }),
    );
    assert.deepEqual(findHiddenListeners(sockets, listeners), []);
  });
});
