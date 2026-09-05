import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { register } from "node:module";
import { promisify } from "node:util";

register("./ts-loader.mjs", import.meta.url);

const execFileAsync = promisify(execFile);

// Dynamically import real exported functions from the codebase
const {
  formatBytes,
  formatGigaBytes,
  calculateSessionUsage,
} = await import("../src/services/speedService.ts");
const { parseSubinterfaceBytes } = await import(
  "../src/services/platform/windows.ts"
);
const { parseNetstatBytes } = await import(
  "../src/services/platform/macos.ts"
);

console.log("==================================================");
console.log("RUNNING COMPREHENSIVE SESSION DATA VERIFICATION");
console.log("==================================================");

// ---------------------------------------------------------------
// 1. Test formatBytes Implementation
// ---------------------------------------------------------------
console.log("\n--- 1. Testing formatBytes ---");

// Non-finite and zero/negative cases
assert.equal(formatBytes(0), "0 B", "0 should format to '0 B'");
assert.equal(formatBytes(-0), "0 B", "-0 should format to '0 B'");
assert.equal(formatBytes(-100), "0 B", "Negative bytes should format to '0 B'");
assert.equal(formatBytes(NaN), "0 B", "NaN should format to '0 B'");
assert.equal(formatBytes(Infinity), "0 B", "Infinity should format to '0 B'");
assert.equal(formatBytes(-Infinity), "0 B", "-Infinity should format to '0 B'");

// Small bytes
assert.equal(formatBytes(1), "1 B");
assert.equal(formatBytes(500), "500 B");
assert.equal(formatBytes(1023), "1023 B");

// Boundary rounding: 1023.4 vs 1023.6 (Math.round bumps to 1024 -> 1.00 KB)
assert.equal(formatBytes(1023.4), "1023 B");
assert.equal(
  formatBytes(1023.6),
  "1.00 KB",
  "1023.6 B rounds to 1024 B, which must adaptively bump to '1.00 KB'",
);

// Standard intermediate intervals
assert.equal(formatBytes(1024), "1.00 KB");
assert.equal(formatBytes(1536), "1.50 KB");
assert.equal(formatBytes(1024 * 1024), "1.00 MB");
assert.equal(formatBytes(2.5 * 1024 * 1024), "2.50 MB");
assert.equal(formatBytes(1024 * 1024 * 1024), "1.00 GB");
assert.equal(formatBytes(5.75 * 1024 * 1024 * 1024), "5.75 GB");
assert.equal(formatBytes(1024 * 1024 * 1024 * 1024), "1.00 TB");
assert.equal(formatBytes(2.5 * 1024 * 1024 * 1024 * 1024), "2.50 TB");

// Unit boundary bump handling (1023.999 * 1024 -> 1.00 MB)
assert.equal(formatBytes(1023.999 * 1024), "1.00 MB");
assert.equal(formatBytes(1023.999 * 1024 * 1024), "1.00 GB");
assert.equal(formatBytes(1023.999 * 1024 * 1024 * 1024), "1.00 TB");

// formatGigaBytes check
assert.equal(formatGigaBytes(0), "0.00 GB");
assert.equal(formatGigaBytes(1024 * 1024 * 1024), "1.00 GB");
assert.equal(formatGigaBytes(5 * 1024 * 1024 * 1024), "5.00 GB");

console.log("✓ formatBytes tests passed!");

// ---------------------------------------------------------------
// 2. Test calculateSessionUsage with Cache Persistence
// ---------------------------------------------------------------
console.log("\n--- 2. Testing calculateSessionUsage Cache behavior ---");

// Test A: Initial connection with 0 bytes (e.g. freshly enabled Wi-Fi adapter)
const resZero = calculateSessionUsage("FreshWiFi", 0, 0);
assert.equal(resZero.downloadedBytes, 0, "Initial delta should be 0");
assert.equal(resZero.uploadedBytes, 0, "Initial delta should be 0");
assert.equal(resZero.totalBytesIn, 0);
assert.equal(resZero.totalBytesOut, 0);

// Test A2: Data arrives on FreshWiFi after baseline was initialized at 0
const resZeroPlus = calculateSessionUsage("FreshWiFi", 5000, 2000);
assert.equal(
  resZeroPlus.downloadedBytes,
  5000,
  "Data transferred from 0 baseline must be captured!",
);
assert.equal(
  resZeroPlus.uploadedBytes,
  2000,
  "Data transferred from 0 baseline must be captured!",
);

// Test B: First launch on MyHomeNet with non-zero hardware counters
const res1 = calculateSessionUsage("MyHomeNet", 10_000_000, 2_000_000);
assert.equal(res1.downloadedBytes, 0, "First launch delta should be 0");
assert.equal(res1.uploadedBytes, 0, "First launch delta should be 0");
assert.equal(res1.totalBytesIn, 10_000_000);
assert.equal(res1.totalBytesOut, 2_000_000);

// Test C: Subsequent query on MyHomeNet after data transfer (simulating Raycast reopen)
const res2 = calculateSessionUsage("MyHomeNet", 25_000_000, 5_000_000);
assert.equal(
  res2.downloadedBytes,
  15_000_000,
  "Delta must be preserved across launches!",
);
assert.equal(
  res2.uploadedBytes,
  3_000_000,
  "Delta must be preserved across launches!",
);
assert.equal(res2.totalBytesIn, 25_000_000);
assert.equal(res2.totalBytesOut, 5_000_000);

// Test D: User switches to CoffeeShop (SSID switch resets delta)
const res3 = calculateSessionUsage("CoffeeShop", 30_000_000, 6_000_000);
assert.equal(res3.downloadedBytes, 0, "Delta should reset when switching to new SSID");
assert.equal(res3.uploadedBytes, 0, "Delta should reset when switching to new SSID");
assert.equal(res3.totalBytesIn, 30_000_000);
assert.equal(res3.totalBytesOut, 6_000_000);

// Test E: CoffeeShop accumulates data
const res4 = calculateSessionUsage("CoffeeShop", 35_000_000, 7_000_000);
assert.equal(res4.downloadedBytes, 5_000_000);
assert.equal(res4.uploadedBytes, 1_000_000);

// Test F: User switches back to MyHomeNet (starts new session on MyHomeNet)
const resBack = calculateSessionUsage("MyHomeNet", 40_000_000, 8_000_000);
assert.equal(
  resBack.downloadedBytes,
  0,
  "Switching back to previous SSID should establish fresh session baseline",
);
assert.equal(resBack.uploadedBytes, 0);

// Test G: Counter wrap / reboot scenario (counters drop below baseline)
const resWrap = calculateSessionUsage("MyHomeNet", 500_000, 100_000);
assert.equal(resWrap.downloadedBytes, 0, "Delta should reset on counter wrap/reboot");
assert.equal(resWrap.uploadedBytes, 0, "Delta should reset on counter wrap/reboot");
assert.equal(resWrap.totalBytesIn, 500_000);
assert.equal(resWrap.totalBytesOut, 100_000);

// Test H: Negative / NaN inputs are safely sanitized
const resSanitized = calculateSessionUsage("MyHomeNet", -500, NaN);
assert.equal(resSanitized.totalBytesIn, 0);
assert.equal(resSanitized.totalBytesOut, 0);
assert.equal(resSanitized.downloadedBytes, 0);
assert.equal(resSanitized.uploadedBytes, 0);

console.log("✓ calculateSessionUsage Cache tests passed!");

// ---------------------------------------------------------------
// 3. Test Windows Netsh Subinterfaces & Multi-Interface Parsing
// ---------------------------------------------------------------
console.log("\n--- 3. Testing Windows netsh parser ---");

const sampleIpv4 = `
       MTU  MediaSenseState      Bytes In     Bytes Out  Interface
----------  ---------------  ------------  ------------  -------------
4294967295                1             0         69231  Loopback Pseudo-Interface 1
      1500                1    4309730893    4402268540  Wi-Fi
      1500                5             0             0  Ethernet
`;
const sampleIpv6 = `
       MTU  MediaSenseState      Bytes In     Bytes Out  Interface
----------  ---------------  ------------  ------------  -------------
4294967295                1             0         59841  Loopback Pseudo-Interface 1
      1500                1         14658         77987  Wi-Fi
      1500                5             0           152  Ethernet
`;

const v4Counters = parseSubinterfaceBytes(sampleIpv4, "Wi-Fi");
assert.deepEqual(v4Counters, { bytesIn: 4309730893, bytesOut: 4402268540 });

const v6Counters = parseSubinterfaceBytes(sampleIpv6, "Wi-Fi");
assert.deepEqual(v6Counters, { bytesIn: 14658, bytesOut: 77987 });

const totalIn = v4Counters.bytesIn + v6Counters.bytesIn;
const totalOut = v4Counters.bytesOut + v6Counters.bytesOut;
assert.equal(totalIn, 4309745551);
assert.equal(totalOut, 4402346527);

// Test Virtual / Direct Adapter Precedence:
// Ensure "Wi-Fi Direct Virtual Adapter" listed BEFORE "Wi-Fi" does NOT intercept "Wi-Fi" query!
const sampleWithVirtualFirst = `
       MTU  MediaSenseState      Bytes In     Bytes Out  Interface
----------  ---------------  ------------  ------------  -------------
      1500                5             0             0  Wi-Fi Direct Virtual Adapter
      1500                1    5555555555    6666666666  Wi-Fi
`;
const exactWifiCounters = parseSubinterfaceBytes(sampleWithVirtualFirst, "Wi-Fi");
assert.deepEqual(
  exactWifiCounters,
  { bytesIn: 5555555555, bytesOut: 6666666666 },
  "Wi-Fi query must prioritize exact match over preceding Wi-Fi Direct Virtual Adapter!",
);

// Test Multi-Interface WLAN Segmentation:
// When netsh wlan show interfaces lists an inactive interface first,
// our segmentation logic picks the connected block.
const multiInterfaceWlanOutput = `
There are 2 interfaces on the system:

    Name                   : Local Area Connection* 1
    Description            : Microsoft Wi-Fi Direct Virtual Adapter
    GUID                   : 11111111-2222-3333-4444-555555555555
    Physical address       : aa:bb:cc:dd:ee:01
    State                  : disconnected

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6 AX200 160MHz
    GUID                   : 66666666-7777-8888-9999-000000000000
    Physical address       : aa:bb:cc:dd:ee:02
    State                  : connected
    SSID                   : OfficeSuperNet
    Signal                 : 95%
`;

const interfaceBlocks = multiInterfaceWlanOutput
  .split(/(?=(?:^|\r?\n)\s*Name\s*:)/i)
  .filter((b) => /Name\s*:/i.test(b));

const activeBlock =
  interfaceBlocks.find((b) => /State\s*:\s*connected/i.test(b)) ||
  interfaceBlocks[0];

const ifaceMatch = activeBlock.match(/^\s*Name\s*:\s*(.+)$/m);
const activeIfaceName = ifaceMatch ? ifaceMatch[1].trim() : "Wi-Fi";
const ssidMatch = activeBlock.match(/SSID\s*:\s*(.+)/i);

assert.equal(
  activeIfaceName,
  "Wi-Fi",
  "Active block segmentation must correctly select 'Wi-Fi' instead of 'Local Area Connection* 1'",
);
assert.equal(
  ssidMatch[1].trim(),
  "OfficeSuperNet",
  "Active block segmentation must correctly select 'OfficeSuperNet'",
);

console.log("✓ Windows netsh parser tests passed!");

// ---------------------------------------------------------------
// 4. Test macOS Netstat Parser
// ---------------------------------------------------------------
console.log("\n--- 4. Testing macOS netstat parser ---");

const sampleMacNetstat = `
Name  Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll
en0   1500  <Link#14>     38:f9:d3:a1:b2:c3 234123     0  987654321   123456     0   12345678     0
en0   1500  fe80::1%en0   fe80::...         234123     -  987654321   123456     -   12345678     -
en0   1500  192.168.1     192.168.1.50      234123     -  987654321   123456     -   12345678     -
`;

const macCounters = parseNetstatBytes(sampleMacNetstat, "en0");
assert.deepEqual(macCounters, { bytesIn: 987654321, bytesOut: 12345678 });

// Test Prefix Collision Prevention:
// If en10 appears before en1, querying en1 must NOT match en10!
const sampleMacPrefixCollision = `
Name  Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll
en10  1500  <Link#20>     00:11:22:33:44:55    100     0      11111       50     0      22222     0
en1   1500  <Link#15>     66:77:88:99:aa:bb  50000     0  999999999    25000     0   88888888     0
`;
const en1Counters = parseNetstatBytes(sampleMacPrefixCollision, "en1");
assert.deepEqual(
  en1Counters,
  { bytesIn: 999999999, bytesOut: 88888888 },
  "Querying 'en1' must not mistakenly match 'en10' even when en10 precedes it!",
);

// Test Inactive Device Marker (en0*):
const sampleMacDown = `
Name  Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll
en0*  1500  <Link#14>     38:f9:d3:a1:b2:c3  10000     0   50000000     5000     0    5000000     0
`;
const en0DownCounters = parseNetstatBytes(sampleMacDown, "en0");
assert.deepEqual(
  en0DownCounters,
  { bytesIn: 50000000, bytesOut: 5000000 },
  "Device name with trailing asterisk (en0*) must be parsed correctly",
);

console.log("✓ macOS netstat parser tests passed!");

// ---------------------------------------------------------------
// 5. Test Live Windows Netsh Execution (Host Environment)
// ---------------------------------------------------------------
if (process.platform === "win32") {
  console.log("\n--- 5. Testing Live Windows Netsh execution ---");
  const { stdout: v4Out } = await execFileAsync("netsh", [
    "interface",
    "ipv4",
    "show",
    "subinterfaces",
  ]);
  const { stdout: v6Out } = await execFileAsync("netsh", [
    "interface",
    "ipv6",
    "show",
    "subinterfaces",
  ]);

  const liveV4 = parseSubinterfaceBytes(v4Out, "Wi-Fi");
  const liveV6 = parseSubinterfaceBytes(v6Out, "Wi-Fi");
  console.log("Live Wi-Fi IPv4 counters:", liveV4);
  console.log("Live Wi-Fi IPv6 counters:", liveV6);

  assert(liveV4 !== undefined, "Live IPv4 Wi-Fi counters should be parsed");
  assert(
    typeof liveV4.bytesIn === "number" && liveV4.bytesIn > 0,
    "Bytes In should be > 0",
  );
  assert(
    typeof liveV4.bytesOut === "number" && liveV4.bytesOut > 0,
    "Bytes Out should be > 0",
  );
  console.log("✓ Live Windows Netsh query verified successfully!");
}

console.log("\n==================================================");
console.log("ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
console.log("==================================================");
