import assert from "node:assert/strict";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  compactBluetoothBattery,
  formatBluetoothBattery,
  normalizeBatteryPercent,
} = await import("../src/utils/bluetoothBattery.ts");
const { parseWindowsBluetoothDevices } =
  await import("../src/services/platform/windows.ts");
const { attachMacBluetoothBatteryLevels, parseMacBluetoothBatteryLevels } =
  await import("../src/services/platform/macos.ts");

assert.equal(normalizeBatteryPercent("87%"), 87);
assert.equal(normalizeBatteryPercent(42.6), 43);
assert.equal(normalizeBatteryPercent(-1), undefined);
assert.equal(normalizeBatteryPercent(101), undefined);
assert.equal(normalizeBatteryPercent("not reported"), undefined);
assert.deepEqual(compactBluetoothBattery({ level: "65%" }), { level: 65 });
assert.equal(compactBluetoothBattery({ level: 200 }), undefined);
assert.equal(formatBluetoothBattery({ level: 65 }), "65%");
assert.equal(
  formatBluetoothBattery({ level: 90, left: 81, right: 76, case: 54 }),
  "L 81% · R 76% · Case 54%",
);

const windowsDevices = parseWindowsBluetoothDevices([
  {
    Id: "BTHENUM\\DEV_001122334455",
    Name: "Connected Headphones",
    Address: "00:11:22:33:44:55",
    IsConnected: true,
    BatteryLevel: 72,
  },
  {
    Id: "BTHENUM\\DEV_AABBCCDDEEFF",
    Name: "Disconnected Mouse",
    Address: "AA:BB:CC:DD:EE:FF",
    IsConnected: false,
    BatteryLevel: 33,
  },
  {
    Id: "BTHENUM\\DEV_102030405060",
    Name: "Invalid Battery",
    Address: "10:20:30:40:50:60",
    IsConnected: true,
    BatteryLevel: 255,
  },
]);
assert.deepEqual(windowsDevices[0].battery, { level: 72 });
assert.equal(windowsDevices[1].battery, undefined);
assert.equal(windowsDevices[2].battery, undefined);

const profilerPayload = {
  SPBluetoothDataType: [
    {
      device_connected: [
        {
          _name: "Wireless Headphones",
          device_address: "00-11-22-33-44-55",
          device_batteryLevelMain: "88%",
        },
        {
          _name: "Earbuds",
          device_addr: "AA:BB:CC:DD:EE:FF",
          device_batteryLevelMain: "99%",
          device_batteryLevelLeft: "81%",
          device_batteryLevelRight: 79,
          device_batteryLevelCase: "54%",
        },
        {
          _name: "Malformed",
          device_address: "10:20:30:40:50:60",
          device_batteryLevelMain: "unknown",
          device_batteryLevelLeft: "105%",
        },
      ],
    },
  ],
};
const macLevels = parseMacBluetoothBatteryLevels(profilerPayload);
assert.deepEqual(macLevels["001122334455"], { level: 88 });
assert.deepEqual(macLevels.aabbccddeeff, {
  level: 99,
  left: 81,
  right: 79,
  case: 54,
});
assert.equal(macLevels["102030405060"], undefined);

const enriched = attachMacBluetoothBatteryLevels(
  [
    {
      id: "connected",
      name: "Wireless Headphones",
      address: "00:11:22:33:44:55",
      category: "audio",
      isConnected: true,
    },
    {
      id: "disconnected",
      name: "Earbuds",
      address: "aa-bb-cc-dd-ee-ff",
      category: "audio",
      isConnected: false,
    },
  ],
  macLevels,
);
assert.deepEqual(enriched[0].battery, { level: 88 });
assert.equal(enriched[1].battery, undefined);

console.log("Bluetooth battery tests passed.");
