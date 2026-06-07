import { test } from "node:test";
import * as assert from "node:assert";

// Test the pure logic from discovery.ts without Raycast/network dependencies

function extractWiiMIP(response: string): string | null {
  const m = response.match(/LOCATION:\s*http:\/\/(\d+\.\d+\.\d+\.\d+)[:/]/i);
  if (!m) return null;
  return /schemas-wiimu-com/i.test(response) ? m[1] : null;
}

function extractDeviceNameFromStatusEx(raw: string): string | undefined {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const name = typeof json.ssid === "string" ? json.ssid.trim() : "";
    return name.length > 0 ? name : undefined;
  } catch {
    return undefined;
  }
}

function getLocalSubnet(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

// extractWiiMIP tests
test("returns null when no LOCATION header", () => {
  assert.strictEqual(extractWiiMIP("HTTP/1.1 200 OK\r\nST: ssdp:all\r\n"), null);
});

test("returns null when LOCATION present but no wiimu marker", () => {
  const response = "HTTP/1.1 200 OK\r\nLOCATION: http://192.168.1.1:1900/desc.xml\r\nST: upnp:rootdevice\r\n";
  assert.strictEqual(extractWiiMIP(response), null);
});

test("returns IP when schemas-wiimu-com present", () => {
  const response = [
    "HTTP/1.1 200 OK",
    "LOCATION: http://192.168.1.140:49152/description.xml",
    "ST: urn:schemas-wiimu-com:service:PlayQueue:1",
    "USN: uuid:FF98F9ED::urn:schemas-wiimu-com:service:PlayQueue:1",
    "",
  ].join("\r\n");
  assert.strictEqual(extractWiiMIP(response), "192.168.1.140");
});

test("is case-insensitive for wiimu detection", () => {
  const response = "LOCATION: http://10.0.0.5:49152/desc.xml\r\nST: urn:schemas-WiiMu-com:service:PlayQueue:1\r\n";
  assert.strictEqual(extractWiiMIP(response), "10.0.0.5");
});

test("handles LOCATION with path slash separator", () => {
  const response = "LOCATION: http://192.168.0.20/description.xml\r\nST: urn:schemas-wiimu-com:service:PlayQueue:1\r\n";
  assert.strictEqual(extractWiiMIP(response), "192.168.0.20");
});

// extractDeviceNameFromStatusEx tests
test("extracts ssid as device name from getStatusEx", () => {
  const status = JSON.stringify({
    ssid: "WiiM Amp Ultra-9BBE",
    project: "WiiM_Amp_Ultra",
  });
  assert.strictEqual(extractDeviceNameFromStatusEx(status), "WiiM Amp Ultra-9BBE");
});

test("returns undefined for blank ssid", () => {
  const status = JSON.stringify({ ssid: "   " });
  assert.strictEqual(extractDeviceNameFromStatusEx(status), undefined);
});

test("returns undefined for invalid JSON", () => {
  assert.strictEqual(extractDeviceNameFromStatusEx("{not-json"), undefined);
});

// getLocalSubnet tests
test("returns subnet for valid IP", () => {
  assert.strictEqual(getLocalSubnet("192.168.1.71"), "192.168.1.0");
});

test("returns undefined for undefined IP", () => {
  assert.strictEqual(getLocalSubnet(undefined), undefined);
});

test("handles different subnets", () => {
  assert.strictEqual(getLocalSubnet("10.0.0.5"), "10.0.0.0");
});
