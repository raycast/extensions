import { exec } from "child_process";
import { promisify } from "util";
import {
  WifiStatus,
  WifiNetwork,
  BluetoothStatus,
  BluetoothDevice,
  BluetoothDeviceCategory,
} from "../types";

const execAsync = promisify(exec);

async function runBash(command: string): Promise<string> {
  const { stdout } = await execAsync(command);
  return stdout.trim();
}

/**
 * Gets the primary Wi-Fi hardware port name (e.g. en0).
 */
async function getMacWifiDevice(): Promise<string> {
  try {
    const output = await runBash("networksetup -listallhardwareports");
    const match = output.match(/Hardware Port:\s*Wi-Fi\s+Device:\s*(\w+)/i);
    return match ? match[1] : "en0";
  } catch {
    return "en0";
  }
}

export async function getMacWifiStatus(): Promise<WifiStatus> {
  try {
    const device = await getMacWifiDevice();
    const powerOutput = await runBash(
      `networksetup -getairportpower ${device}`,
    );
    const isOn = /on/i.test(powerOutput);

    if (!isOn) {
      return { isOn: false, isConnected: false };
    }

    const airportPath =
      "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
    let infoOutput = "";
    try {
      infoOutput = await runBash(`${airportPath} -I`);
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
      ipAddress = await runBash(`ipconfig getifaddr ${device}`);
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
  await runBash(
    `networksetup -setairportpower ${device} ${nextState ? "on" : "off"}`,
  );
  return nextState;
}

export async function getMacWifiNetworks(): Promise<WifiNetwork[]> {
  try {
    const airportPath =
      "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
    const scanOutput = await runBash(`${airportPath} -s`);
    const current = await getMacWifiStatus();

    const networks: WifiNetwork[] = [];
    const lines = scanOutput.split("\n").slice(1);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;
      const ssid = parts[0];
      const rssi = parseInt(parts[2], 10) || -70;
      const signalPercent = Math.max(0, Math.min(100, 2 * (rssi + 100)));
      const security = parts[parts.length - 1] || "Open";

      networks.push({
        ssid,
        signalPercent,
        authentication: security,
        isSaved: false,
        isConnected: ssid === current.ssid,
      });
    }

    return networks;
  } catch {
    return [];
  }
}

export async function connectMacWifi(
  ssid: string,
  password?: string,
): Promise<void> {
  const device = await getMacWifiDevice();
  if (password) {
    await runBash(
      `networksetup -setairportnetwork ${device} "${ssid}" "${password}"`,
    );
  } else {
    await runBash(`networksetup -setairportnetwork ${device} "${ssid}"`);
  }
}

export async function disconnectMacWifi(): Promise<void> {
  const device = await getMacWifiDevice();
  // On macOS, disconnecting can be achieved by toggling power off and back on or disassociating
  await runBash(
    `sudo airport ${device} -z || networksetup -setairportpower ${device} off && networksetup -setairportpower ${device} on`,
  );
}

export async function getMacBluetoothStatus(): Promise<BluetoothStatus> {
  try {
    const output = await runBash("blueutil --power");
    return { isOn: output.trim() === "1" };
  } catch {
    return { isOn: true };
  }
}

export async function toggleMacBluetooth(
  targetState?: boolean,
): Promise<boolean> {
  const current = await getMacBluetoothStatus();
  const next = targetState !== undefined ? targetState : !current.isOn;
  await runBash(`blueutil --power ${next ? "1" : "0"}`);
  return next;
}

export async function getMacBluetoothDevices(): Promise<BluetoothDevice[]> {
  try {
    const output = await runBash("blueutil --paired --format json");
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
  await runBash(
    `blueutil --${connect ? "connect" : "disconnect"} "${address}"`,
  );
}

export async function openMacWifiSettings(): Promise<void> {
  await runBash(
    'open "x-apple.systempreferences:com.apple.preference.network"',
  );
}

export async function openMacBluetoothSettings(): Promise<void> {
  await runBash(
    'open "x-apple.systempreferences:com.apple.preferences.Bluetooth"',
  );
}
