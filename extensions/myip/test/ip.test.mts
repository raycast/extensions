import assert from "node:assert/strict";
import test from "node:test";
import * as ip from "../src/ip.ts";

test("extractIPv4 reads the myip.ipip.net response", () => {
  assert.equal(ip.extractIPv4("当前 IP：203.0.113.42  来自于：中国 上海 上海  电信\n"), "203.0.113.42");
  assert.equal(ip.extractIPv4("<html>my ip is 1.2.3.4</html>"), "1.2.3.4");
  assert.equal(ip.extractIPv4("no address here"), null);
});

test("isPrivateIPv4 only accepts RFC1918", () => {
  for (const address of ["10.0.0.1", "172.16.0.1", "172.31.255.254", "192.168.1.42"]) {
    assert.equal(ip.isPrivateIPv4(address), true, address);
  }
  for (const address of [
    "127.0.0.1",
    "169.254.1.1",
    "172.32.0.1",
    "100.64.0.1",
    "203.0.113.42",
    "8.8.8.8",
  ]) {
    assert.equal(ip.isPrivateIPv4(address), false, address);
  }
});

test("virtual NIC names are filtered", () => {
  for (const name of [
    "utun3",
    "bridge100",
    "awdl0",
    "llw0",
    "docker0",
    "veth123",
    "vmnet8",
    "vEthernet (WSL)",
    "br-abc",
    "tun0",
    "tap0",
    "ppp0",
  ]) {
    assert.equal(ip.isVirtualInterface(name), true, name);
  }
  for (const name of ["en0", "en1", "eth0", "wlan0", "Wi-Fi", "Ethernet"]) {
    assert.equal(ip.isVirtualInterface(name), false, name);
  }
});

test("filterLocalIPv4 keeps only private IPv4 on physical NICs", () => {
  const interfaces = {
    lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
    en0: [
      { address: "fe80::1", family: "IPv6", internal: false },
      { address: "192.168.1.42", family: "IPv4", internal: false },
    ],
    en1: [{ address: "10.0.0.8", family: "IPv4", internal: false }],
    en2: [{ address: "203.0.113.42", family: "IPv4", internal: false }],
    utun3: [{ address: "10.8.0.2", family: "IPv4", internal: false }],
    bridge100: [{ address: "192.168.139.3", family: "IPv4", internal: false }],
    docker0: [{ address: "172.17.0.1", family: "IPv4", internal: false }],
    vEthernet: [{ address: "172.20.0.1", family: "IPv4", internal: false }],
  } as unknown as Parameters<typeof ip.filterLocalIPv4>[0];

  assert.deepEqual(
    ip.filterLocalIPv4(interfaces).map((item) => `${item.interfaceName}=${item.address}`),
    ["en0=192.168.1.42", "en1=10.0.0.8"],
  );
});

test("formatIpLines always returns the two requested lines", () => {
  assert.equal(typeof ip.formatIpLines, "function", "formatIpLines should exist");
  assert.deepEqual(ip.formatIpLines([{ address: "192.168.1.42", interfaceName: "en0" }], "203.0.113.42"), [
    "Internal IP: 192.168.1.42",
    "External IP: 203.0.113.42",
  ]);
  assert.deepEqual(ip.formatIpLines([], null), [
    "Internal IP: No internal IPv4 found",
    "External IP: Fetch failed; use Refresh to retry",
  ]);
  assert.deepEqual(ip.formatIpLines([], undefined, true), [
    "Internal IP: No internal IPv4 found",
    "External IP: Fetching…",
  ]);
});

test("public is first (Enter); internal is the secondary action (Cmd+Enter)", () => {
  assert.equal(typeof ip.getCopyActions, "function", "getCopyActions should exist");
  const actions = ip.getCopyActions("192.168.1.42", "203.0.113.42");
  assert.deepEqual(
    actions.map((action) => action.target),
    ["external", "internal"],
  );
  assert.equal(actions[0].content, "203.0.113.42");
  // Raycast binds the second action to Cmd+Enter as the secondary action.
  assert.equal(actions[1].content, "192.168.1.42");
  assert.equal(actions[1].shortcut, undefined);
  assert.deepEqual(
    ip.getCopyActions("192.168.1.42", null).map((action) => action.target),
    ["internal"],
  );
  assert.deepEqual(
    ip.getCopyActions("", "203.0.113.42").map((action) => action.target),
    ["external"],
  );
});
