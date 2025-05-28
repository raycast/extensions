import { spawnSync } from "child_process";

export function getWifiSSIDSync(): string | null | undefined {
  try {
    const p = spawnSync("/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport", ["-I"], {
      encoding: "utf-8",
    });
    if (!p) {
      return undefined;
    }
    const ssid_line = p.stdout.split("\n")?.find((v) => v.trim().startsWith("SSID:"));
    if (!ssid_line) {
      return null;
    }
    const ssid = ssid_line.split(":")[1] || null;

    return ssid?.trim();
  } catch {
    return undefined;
  }
}
