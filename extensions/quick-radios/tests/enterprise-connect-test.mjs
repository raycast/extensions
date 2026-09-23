import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import { register, syncBuiltinESMExports } from "node:module";
import { promisify } from "node:util";

register("./ts-loader.mjs", import.meta.url);

// ---------------------------------------------------------------
// Fake netsh: windows.ts promisifies execFile at load time, so the
// stub must be installed before the module is imported.
// ---------------------------------------------------------------
let fakeNetwork;
let savedProfiles;
let netshCalls;

function fakeNetsh(args) {
  const command = args.slice(0, 3).join(" ");
  if (command === "wlan show profile") {
    const name = args[3].replace(/^name=/, "");
    return savedProfiles.has(name)
      ? `Profile ${name} on interface Wi-Fi:\nAuthentication : ${fakeNetwork.authentication}`
      : `Profile "${name}" is not found on any interface.`;
  }
  if (command === "wlan show networks") {
    return `Interface name : Wi-Fi\nThere are 1 networks currently visible.\n\nSSID 1 : ${fakeNetwork.ssid}\n    Network type            : Infrastructure\n    Authentication          : ${fakeNetwork.authentication}\n    Encryption              : CCMP\n`;
  }
  if (command === "wlan add profile") {
    const file = args[3].replace(/^filename=/, "");
    return { xml: fs.readFileSync(file, "utf-8") };
  }
  return "";
}

const realExecFile = childProcess.execFile;
function stubExecFile(file, args, options, callback) {
  return realExecFile(file, args, options, callback);
}
stubExecFile[promisify.custom] = async (file, args) => {
  if (file !== "netsh") throw new Error(`Unexpected command: ${file}`);
  const result = fakeNetsh(args);
  netshCalls.push({ args, xml: result.xml });
  return { stdout: typeof result === "string" ? result : "", stderr: "" };
};
childProcess.execFile = stubExecFile;
syncBuiltinESMExports();

const { connectWindowsWifi } =
  await import("../src/services/platform/windows.ts");

function reset(network, saved = []) {
  fakeNetwork = network;
  savedProfiles = new Set(saved);
  netshCalls = [];
}

const addedProfiles = () =>
  netshCalls.filter((c) => c.args.slice(0, 3).join(" ") === "wlan add profile");
const connectCalls = () =>
  netshCalls.filter((c) => c.args.slice(0, 2).join(" ") === "wlan connect");

console.log("==================================================");
console.log("RUNNING ENTERPRISE (802.1X) CONNECT VERIFICATION");
console.log("==================================================");

// ---------------------------------------------------------------
// 1. Unsaved Enterprise network is handed off to Windows
// ---------------------------------------------------------------
console.log("\n--- 1. Unsaved Enterprise network ---");

reset({ ssid: "CampusNet", authentication: "WPA2-Enterprise" });
await assert.rejects(
  connectWindowsWifi("CampusNet", "hunter2"),
  /802\.1X/,
  "Unsaved Enterprise networks must be rejected with a hand-off message",
);
assert.equal(addedProfiles().length, 0, "No profile may be written");
assert.equal(connectCalls().length, 0, "No connect may be attempted");

reset({ ssid: "CampusNet", authentication: "WPA3-Enterprise 192 Bits" });
await assert.rejects(connectWindowsWifi("CampusNet"), /802\.1X/);
assert.equal(addedProfiles().length, 0);

console.log("✓ Unsaved Enterprise networks are rejected without side effects");

// ---------------------------------------------------------------
// 2. Saved Enterprise profile reconnects untouched
// ---------------------------------------------------------------
console.log("\n--- 2. Saved Enterprise profile ---");

reset({ ssid: "CampusNet", authentication: "WPA2-Enterprise" }, ["CampusNet"]);
await connectWindowsWifi("CampusNet");
assert.equal(addedProfiles().length, 0, "Saved profile must not be rewritten");
assert.deepEqual(connectCalls()[0].args, ["wlan", "connect", "name=CampusNet"]);

reset({ ssid: "CampusNet", authentication: "WPA2-Enterprise" }, ["CampusNet"]);
await connectWindowsWifi("CampusNet", "ignored-password");
assert.equal(
  addedProfiles().length,
  0,
  "A password must never overwrite a saved Enterprise profile",
);
assert.equal(connectCalls().length, 1);

console.log("✓ Saved Enterprise profiles reconnect without being overwritten");

// ---------------------------------------------------------------
// 3. Personal networks still write a PSK profile (regression)
// ---------------------------------------------------------------
console.log("\n--- 3. Personal network regression ---");

reset({ ssid: "HomeWiFi", authentication: "WPA2-Personal" });
await connectWindowsWifi("HomeWiFi", "s3cret&pass");
assert.equal(addedProfiles().length, 1, "A PSK profile must be written");
const xml = addedProfiles()[0].xml;
assert.match(xml, /<authentication>WPA2PSK<\/authentication>/);
assert.match(xml, /<keyMaterial>s3cret&amp;pass<\/keyMaterial>/);
assert.doesNotMatch(xml, /<useOneX>true<\/useOneX>/);
assert.equal(connectCalls().length, 1);

console.log("✓ Personal networks still join with a password");

console.log("\n==================================================");
console.log("ALL ENTERPRISE CONNECT TESTS PASSED SUCCESSFULLY! 🎉");
console.log("==================================================");
