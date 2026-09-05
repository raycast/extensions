import { execFile } from "child_process";
import { promisify } from "util";
import {
  WifiStatus,
  WifiNetwork,
  BluetoothStatus,
  BluetoothDevice,
  BluetoothDeviceCategory,
} from "../types";

const execFileAsync = promisify(execFile);

async function runExecFile(file: string, args: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync(file, args);
  return stdout.trim();
}

const AIRPORT_PATH =
  "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";

/**
 * Gets the primary Wi-Fi hardware port name (e.g. en0).
 */
async function getMacWifiDevice(): Promise<string> {
  try {
    const output = await runExecFile("networksetup", ["-listallhardwareports"]);
    const match = output.match(/Hardware Port:\s*Wi-Fi\s+Device:\s*(\w+)/i);
    return match ? match[1] : "en0";
  } catch {
    return "en0";
  }
}

export async function getMacWifiStatus(): Promise<WifiStatus> {
  try {
    const device = await getMacWifiDevice();
    const powerOutput = await runExecFile("networksetup", [
      "-getairportpower",
      device,
    ]);
    const isOn = /on/i.test(powerOutput);

    if (!isOn) {
      return { isOn: false, isConnected: false };
    }

    let infoOutput = "";
    try {
      infoOutput = await runExecFile(AIRPORT_PATH, ["-I"]);
    } catch {
      // If airport utility is not accessible
    }

    const ssidMatch = infoOutput.match(/\s+SSID:\s*(.+)/);
    const bssidMatch = infoOutput.match(/\s+BSSID:\s*(.+)/);
    const channelMatch = infoOutput.match(/\s+channel:\s*(\d+)/);
    const rssiMatch = infoOutput.match(/\s+agrCtlRSSI:\s*(-?\d+)/);

    let signalPercent: number | undefined;
    if (rssiMatch) {
      const rssi = parseInt(rssiMatch[1], 10);
      // Convert standard dBm (-100 to -50) to 0-100%
      signalPercent = Math.max(0, Math.min(100, 2 * (rssi + 100)));
    }

    let ipAddress: string | undefined;
    try {
      ipAddress = await runExecFile("ipconfig", ["getifaddr", device]);
    } catch {
      // IP query fallback
    }

    const isConnected = Boolean(ssidMatch && ssidMatch[1].trim());

    return {
      isOn: true,
      isConnected,
      ssid: ssidMatch ? ssidMatch[1].trim() : undefined,
      bssid: bssidMatch ? bssidMatch[1].trim() : undefined,
      channel: channelMatch ? channelMatch[1].trim() : undefined,
      signalPercent,
      ipAddress,
    };
  } catch {
    return { isOn: false, isConnected: false };
  }
}

export async function toggleMacWifi(targetState?: boolean): Promise<boolean> {
  const device = await getMacWifiDevice();
  const current = await getMacWifiStatus();
  const nextState = targetState !== undefined ? targetState : !current.isOn;
  await runExecFile("networksetup", [
    "-setairportpower",
    device,
    nextState ? "on" : "off",
  ]);
  return nextState;
}

export async function getMacWifiNetworks(): Promise<WifiNetwork[]> {
  try {
    const scanOutput = await runExecFile(AIRPORT_PATH, ["-s"]);
    const current = await getMacWifiStatus();

    const lines = scanOutput.split("\n").slice(1);
    // Match multi-word SSID anchored before the standard 17-char BSSID MAC address
    const lineRegex =
      /^\s*(.*?)\s+([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})\s+(-?\d+)\s+(.*)$/;
    const networkMap = new Map<string, WifiNetwork>();

    for (const line of lines) {
      const match = line.match(lineRegex);
      if (!match) continue;
      const ssid = match[1].trim();
      if (!ssid) continue;
      const rssi = parseInt(match[3], 10) || -70;
      const signalPercent = Math.max(0, Math.min(100, 2 * (rssi + 100)));
      const remainder = match[4].trim();
      const remParts = remainder.split(/\s+/);
      const rawSecurity =
        remParts.length > 3
          ? remParts.slice(3).join(" ")
          : remParts[remParts.length - 1] || "Open";
      const security =
        rawSecurity === "NONE" || rawSecurity === "--" ? "Open" : rawSecurity;

      const existing = networkMap.get(ssid);
      if (!existing || signalPercent > existing.signalPercent) {
        networkMap.set(ssid, {
          ssid,
          signalPercent,
          authentication: security,
          isSaved: false,
          isConnected: ssid === current.ssid,
        });
      }
    }

    return Array.from(networkMap.values()).sort((a, b) => {
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;
      return b.signalPercent - a.signalPercent;
    });
  } catch {
    return [];
  }
}

export async function connectMacWifi(
  ssid: string,
  password?: string,
): Promise<void> {
  const device = await getMacWifiDevice();
  const args = ["-setairportnetwork", device, ssid];
  if (password) {
    args.push(password);
  }
  await runExecFile("networksetup", args);
}

export async function disconnectMacWifi(): Promise<void> {
  const device = await getMacWifiDevice();

  // 1. Try real disassociation via CoreWLAN (JXA)
  try {
    await runExecFile("osascript", [
      "-l",
      "JavaScript",
      "-e",
      `ObjC.import('CoreWLAN');
       var client = $.CWWiFiClient.sharedWiFiClient;
       var iface = client.interfaceWithName("${device}") || client.interface;
       if (iface) { iface.disassociate(); }`,
    ]);
  } catch {
    // 2. Fallback to airport disassociate
    try {
      await runExecFile(AIRPORT_PATH, ["-z"]);
    } catch {
      try {
        await runExecFile(AIRPORT_PATH, [device, "-z"]);
      } catch {
        // Disassociation attempt failed
      }
    }
  }

  // 3. Verify resulting connection state
  await new Promise((resolve) => setTimeout(resolve, 500));
  const status = await getMacWifiStatus();
  if (status.isConnected) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const retryStatus = await getMacWifiStatus();
    if (retryStatus.isConnected) {
      throw new Error("Failed to disassociate from Wi-Fi network.");
    }
  }
}

let cachedBlueutilPath: string | null | undefined = undefined;

async function getBlueutilPath(): Promise<string | null> {
  if (cachedBlueutilPath !== undefined) return cachedBlueutilPath;

  const candidates = [
    "/opt/homebrew/bin/blueutil",
    "/usr/local/bin/blueutil",
    "blueutil",
  ];

  for (const candidate of candidates) {
    try {
      await runExecFile(candidate, ["-v"]);
      cachedBlueutilPath = candidate;
      return candidate;
    } catch {
      // Continue searching
    }
  }

  cachedBlueutilPath = null;
  return null;
}

export async function getMacBluetoothStatus(): Promise<BluetoothStatus> {
  const blueutil = await getBlueutilPath();
  if (blueutil) {
    try {
      const output = await runExecFile(blueutil, ["--power"]);
      return { isOn: output.trim() === "1" };
    } catch {
      // Fallback to native
    }
  }

  // Stock macOS native check 1: defaults read
  try {
    const output = await runExecFile("defaults", [
      "read",
      "/Library/Preferences/com.apple.Bluetooth",
      "ControllerPowerState",
    ]);
    return { isOn: output.trim() === "1" };
  } catch {
    // Fallback to system_profiler
  }

  // Stock macOS native check 2: system_profiler
  try {
    const output = await runExecFile("system_profiler", [
      "SPBluetoothDataType",
      "-json",
    ]);
    const parsed = JSON.parse(output);
    const btData = parsed?.SPBluetoothDataType?.[0];
    const stateStr =
      btData?.controller_properties?.controller_state ||
      btData?.controller_state ||
      "";
    return { isOn: /attrib_on|on/i.test(stateStr) };
  } catch {
    return { isOn: false };
  }
}

export async function toggleMacBluetooth(
  targetState?: boolean,
): Promise<boolean> {
  const current = await getMacBluetoothStatus();
  const next = targetState !== undefined ? targetState : !current.isOn;

  const blueutil = await getBlueutilPath();
  if (blueutil) {
    await runExecFile(blueutil, ["--power", next ? "1" : "0"]);
    return next;
  }

  // Stock macOS: attempt toggle using native Shortcuts CLI
  try {
    const shortcutName = next ? "Turn Bluetooth On" : "Turn Bluetooth Off";
    await runExecFile("shortcuts", ["run", shortcutName]);
    return next;
  } catch {
    // Shortcuts not configured
  }

  throw new Error(
    "Toggling Bluetooth on macOS requires 'blueutil'. Please install it using 'brew install blueutil' or toggle Bluetooth via macOS Control Center.",
  );
}

export async function getMacBluetoothDevices(): Promise<BluetoothDevice[]> {
  const blueutil = await getBlueutilPath();
  if (blueutil) {
    try {
      const output = await runExecFile(blueutil, [
        "--paired",
        "--format",
        "json",
      ]);
      const parsed = JSON.parse(output);
      return parsed.map(
        (item: { address: string; name: string; connected: boolean }) => ({
          id: item.address,
          name: item.name,
          address: item.address,
          category: categorizeMacDevice(item.name),
          isConnected: item.connected,
          isPaired: true,
        }),
      );
    } catch {
      // Fallback to native
    }
  }

  // Stock macOS native discovery using AppleScript IOBluetooth framework
  try {
    const script = `use framework "IOBluetooth"
use framework "Foundation"
use scripting additions

set output to ""
set devList to current application's IOBluetoothDevice's pairedDevices()
if devList is not missing value then
  repeat with d in (devList as list)
    set addr to (d's addressString() as string)
    set dName to (d's nameOrAddress() as string)
    set isConn to (d's isConnected() as boolean)
    set output to output & addr & tab & (isConn as string) & tab & dName & linefeed
  end repeat
end if
return output`;

    const output = await runExecFile("osascript", ["-e", script]);
    if (output.trim()) {
      const devices: BluetoothDevice[] = [];
      const lines = output.split("\n");
      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length < 3) continue;
        const address = parts[0].trim();
        const isConnected = parts[1].trim().toLowerCase() === "true";
        const name = parts.slice(2).join("\t").trim();
        if (!address) continue;
        devices.push({
          id: address,
          name: name || address,
          address,
          category: categorizeMacDevice(name),
          isConnected,
          isPaired: true,
        });
      }
      return devices;
    }
  } catch {
    // Fallback to system_profiler
  }

  // Stock macOS fallback using system_profiler
  try {
    const output = await runExecFile("system_profiler", [
      "SPBluetoothDataType",
      "-json",
    ]);
    const parsed = JSON.parse(output);
    const btData = parsed?.SPBluetoothDataType?.[0];
    const devices: BluetoothDevice[] = [];

    const processDevice = (
      raw: Record<string, unknown>,
      connectedHint?: boolean,
    ) => {
      const name =
        (raw._name as string) || (raw.name as string) || "Unknown Device";
      const address =
        (raw.device_address as string) ||
        (raw.device_addr as string) ||
        (raw.address as string) ||
        "";
      if (!address) return;
      const isConnected =
        connectedHint !== undefined
          ? connectedHint
          : /attrib_yes|yes|true/i.test(
              String(raw.device_connected || raw.connected || ""),
            );
      devices.push({
        id: address,
        name,
        address,
        category: categorizeMacDevice(name),
        isConnected,
        isPaired: true,
      });
    };

    if (Array.isArray(btData?.device_connected)) {
      for (const d of btData.device_connected) processDevice(d, true);
    }
    if (Array.isArray(btData?.device_not_connected)) {
      for (const d of btData.device_not_connected) processDevice(d, false);
    }
    if (Array.isArray(btData?.devices_list)) {
      for (const d of btData.devices_list) processDevice(d);
    }

    return devices;
  } catch {
    return [];
  }
}

function categorizeMacDevice(name: string): BluetoothDeviceCategory {
  const lower = name.toLowerCase();
  if (/airpods|buds|headset|headphones|speaker|beats/i.test(lower))
    return "audio";
  if (/mouse|trackpad|keyboard/i.test(lower)) return "peripheral";
  if (/controller|gamepad|dualsense/i.test(lower)) return "controller";
  if (/iphone|ipad/i.test(lower)) return "phone";
  return "other";
}

export async function toggleMacBluetoothDeviceConnection(
  address: string,
  connect: boolean,
): Promise<void> {
  const blueutil = await getBlueutilPath();
  if (blueutil) {
    try {
      await runExecFile(blueutil, [
        connect ? "--connect" : "--disconnect",
        address,
      ]);
      return;
    } catch {
      // Fallback to native
    }
  }

  // Stock macOS native connection management using AppleScript IOBluetooth
  const normalizedTarget = address.replace(/[:-]/g, "").toLowerCase();
  const script = `use framework "IOBluetooth"
use framework "Foundation"
use scripting additions

set normTarget to "${normalizedTarget}"
set devList to current application's IOBluetoothDevice's pairedDevices()
set found to false
if devList is not missing value then
  repeat with d in (devList as list)
    set curAddr to (d's addressString() as string)
    set cleanAddr to do shell script "echo " & quoted form of curAddr & " | tr -d ':-' | tr '[:upper:]' '[:lower:]'"
    if cleanAddr is equal to normTarget then
      set found to true
      if ${connect ? "true" : "false"} then
        d's openConnection()
      else
        d's closeConnection()
      end if
      exit repeat
    end if
  end repeat
end if
if not found then
  error "Bluetooth device " & normTarget & " not found."
end if`;

  await runExecFile("osascript", ["-e", script]);
}

export async function openMacWifiSettings(): Promise<void> {
  await runExecFile("open", [
    "x-apple.systempreferences:com.apple.preference.network",
  ]);
}

export async function openMacBluetoothSettings(): Promise<void> {
  await runExecFile("open", [
    "x-apple.systempreferences:com.apple.preferences.Bluetooth",
  ]);
}
