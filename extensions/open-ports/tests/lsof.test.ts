import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyExposure, parseAddress, parseLsof } from "../src/core/lsof";
import { HEADER, listenersFrom, row } from "./fixtures";

describe("parseLsof", () => {
  it("reads every column of a listening row", () => {
    const [parsed] = parseLsof(row({ command: "nginx", pid: 501, user: "root", address: "*:80" }));

    assert.equal(parsed.pid, 501);
    assert.equal(parsed.command, "nginx");
    assert.equal(parsed.user, "root");
    assert.equal(parsed.binding.port, 80);
    assert.equal(parsed.binding.host, "*");
    assert.equal(parsed.binding.ipVersion, "IPv4");
    assert.equal(parsed.binding.exposure, "all-interfaces");
  });

  it("decodes the \\xNN escapes lsof uses for spaces in command names", () => {
    const [parsed] = parseLsof(row({ command: "Google\\x20Drive", address: "localhost:7679" }));
    assert.equal(parsed.command, "Google Drive");
  });

  it("skips the header, blank lines and anything that is not an IP socket", () => {
    const output = [HEADER, "", "mdns 1 alice cwd DIR 1,2 640 2 /", row({ address: "*:5000" })].join("\n");
    assert.equal(parseLsof(output).length, 1);
  });

  it("refuses rows whose PID would be dangerous to signal", () => {
    assert.equal(parseLsof(row({ pid: 0, address: "*:5000" })).length, 0);
    assert.equal(parseLsof("node -1 alice 10u IPv4 0x1 0t0 TCP *:5000 (LISTEN)").length, 0);
  });

  it("keeps the raw line for the detail panel", () => {
    const line = row({ address: "*:5000" });
    assert.equal(parseLsof(line)[0].binding.raw, line);
  });
});

describe("parseAddress", () => {
  it("handles the address shapes lsof emits", () => {
    assert.deepEqual(parseAddress("*:7000"), { host: "*", port: 7000 });
    assert.deepEqual(parseAddress("127.0.0.1:8080"), { host: "127.0.0.1", port: 8080 });
    assert.deepEqual(parseAddress("localhost:1025"), { host: "localhost", port: 1025 });
    assert.deepEqual(parseAddress("[::1]:8080"), { host: "::1", port: 8080 });
    assert.deepEqual(parseAddress("[fe80::1%en0]:9999"), { host: "fe80::1%en0", port: 9999 });
  });

  it("rejects ports outside the valid range", () => {
    assert.equal(parseAddress("*:0"), null);
    assert.equal(parseAddress("*:70000"), null);
    assert.equal(parseAddress("*:http"), null);
    assert.equal(parseAddress("nonsense"), null);
  });
});

describe("classifyExposure", () => {
  it("separates loopback from network-reachable addresses", () => {
    assert.equal(classifyExposure("127.0.0.1"), "loopback");
    assert.equal(classifyExposure("127.94.0.1"), "loopback");
    assert.equal(classifyExposure("localhost"), "loopback");
    assert.equal(classifyExposure("::1"), "loopback");
    assert.equal(classifyExposure("*"), "all-interfaces");
    assert.equal(classifyExposure("0.0.0.0"), "all-interfaces");
    assert.equal(classifyExposure("::"), "all-interfaces");
    assert.equal(classifyExposure("192.168.1.5"), "specific");
  });
});

describe("groupByProcessAndPort", () => {
  it("merges the IPv4 and IPv6 rows of one process into a single listener", () => {
    const listeners = listenersFrom(
      row({ pid: 662, command: "ControlCenter", fd: "12u", ipVersion: "IPv4", address: "*:5000" }),
      row({ pid: 662, command: "ControlCenter", fd: "13u", ipVersion: "IPv6", address: "*:5000" }),
    );

    assert.equal(listeners.length, 1);
    assert.deepEqual(listeners[0].ipVersions, ["IPv4", "IPv6"]);
    assert.equal(listeners[0].bindings.length, 2);
  });

  it("keeps different ports and different processes apart", () => {
    const listeners = listenersFrom(
      row({ pid: 1, address: "*:9000" }),
      row({ pid: 1, address: "*:3000" }),
      row({ pid: 2, address: "*:3000" }),
    );

    assert.deepEqual(
      listeners.map((listener) => [listener.port, listener.pid]),
      [
        [3000, 1],
        [3000, 2],
        [9000, 1],
      ],
    );
  });

  it("reports the most permissive exposure of all merged bindings", () => {
    const [listener] = listenersFrom(
      row({ pid: 7, ipVersion: "IPv4", address: "127.0.0.1:8080" }),
      row({ pid: 7, ipVersion: "IPv4", fd: "11u", address: "192.168.1.5:8080" }),
    );

    assert.equal(listener.exposure, "specific");
  });
});
