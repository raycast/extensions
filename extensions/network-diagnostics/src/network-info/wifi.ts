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

// Finds information about the current Wi-Fi connection using the `airport` utility.
export async function wifiInfo(): Promise<WiFiInfo> {
  const airportBin = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
  const { stdout, exitCode } = await execa(airportBin, ["-I"], { timeout: 1000 });
  if (exitCode !== 0) {
    throw new Error("Could not retreive Wi-Fi details");
  }

  const rssi = parseInt(stdout.match(/agrCtlRSSI: ([-0-9]+)/)?.[1] ?? "", 10);
  const ssid = stdout.match(/SSID: (.+)/)?.[1];
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
