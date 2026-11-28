import { spawnSync } from "child_process";

// Apple removed the `airport` CLI starting macOS 14.4, so SSID detection must
// go through networksetup instead: find the Wi-Fi hardware port's device
// name, then ask that device for its current network.
function getWifiDeviceName(): string | undefined {
  const p = spawnSync("/usr/sbin/networksetup", ["-listallhardwareports"], { encoding: "utf-8" });
  const lines = p?.stdout?.split("\n") ?? [];
  const wifiIndex = lines.findIndex((l) => l.trim() === "Hardware Port: Wi-Fi");
  if (wifiIndex === -1) {
    return undefined;
  }
  const deviceLine = lines.slice(wifiIndex + 1).find((l) => l.trim().startsWith("Device:"));
  return deviceLine?.split(":")[1]?.trim();
}

export function getWifiSSIDSync(): string | null | undefined {
  try {
    const device = getWifiDeviceName();
    if (!device) {
      return undefined;
    }
    const p = spawnSync("/usr/sbin/networksetup", ["-getairportnetwork", device], { encoding: "utf-8" });
    const match = p?.stdout?.match(/^Current Wi-Fi Network: (.+)$/m);
    return match ? match[1].trim() : null;
  } catch (error) {
    return undefined;
  }
}
