import { execa } from "execa";

export interface WiFiInfo {
  ssid?: string;
  rssi?: number;
  linkStrength?: LinkStrength;
}

export enum LinkStrength {
  Excellent = "Excellent",
  Good = "Good",
  Fair = "Fair",
  Poor = "Poor",
}

// Finds information about the current Wi-Fi connection via the CoreWLAN
// framework (through JXA). The `airport` utility this used previously was
// removed in macOS Tahoe (26), so it now fails with ENOENT there (#30583).
export async function wifiInfo(): Promise<WiFiInfo> {
  const script =
    'ObjC.import("CoreWLAN"); const iface = $.CWWiFiClient.sharedWiFiClient.interface; ' +
    "JSON.stringify({ ssid: iface.ssid.js, rssi: iface.rssiValue });";
  const { stdout, exitCode } = await execa("osascript", ["-l", "JavaScript", "-e", script], {
    timeout: 1000,
  });
  if (exitCode !== 0) {
    throw new Error("Could not retreive Wi-Fi details");
  }

  const parsed = JSON.parse(stdout) as { ssid?: unknown; rssi?: unknown };
  const rssi = Number(parsed.rssi);
  const ssid = typeof parsed.ssid === "string" && parsed.ssid.length > 0 ? parsed.ssid : undefined;
  if (Number.isNaN(rssi) || !ssid) {
    return {};
  }

  return { rssi, ssid, linkStrength: rssiToLinkStrength(rssi) };
}

function rssiToLinkStrength(rssi: number): LinkStrength {
  if (rssi >= -55) {
    return LinkStrength.Excellent;
  } else if (rssi >= -70) {
    return LinkStrength.Good;
  } else if (rssi >= -80) {
    return LinkStrength.Fair;
  } else {
    return LinkStrength.Poor;
  }
}
