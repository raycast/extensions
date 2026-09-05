import { Color, Icon } from "@raycast/api";

import type { WifiNetwork } from "./types";

export function sortNetworks(networks: WifiNetwork[]): WifiNetwork[] {
  return [...networks].sort((a, b) => {
    if (a.current !== b.current) {
      return a.current ? -1 : 1;
    }
    const aVisible = a.rssi !== 0;
    const bVisible = b.rssi !== 0;
    if (aVisible !== bVisible) {
      return aVisible ? -1 : 1;
    }
    // Stronger signal first (e.g. -40 before -70)
    return b.rssi - a.rssi;
  });
}

export function signalLabel(rssi: number): string {
  if (rssi === 0) {
    return "Not in range";
  }
  return `${rssi} dBm`;
}

export function signalQuality(rssi: number): "excellent" | "good" | "fair" | "weak" | "out" {
  if (rssi === 0) {
    return "out";
  }
  if (rssi >= -50) {
    return "excellent";
  }
  if (rssi >= -60) {
    return "good";
  }
  if (rssi >= -70) {
    return "fair";
  }
  return "weak";
}

export function signalColor(rssi: number): Color {
  const quality = signalQuality(rssi);
  switch (quality) {
    case "excellent":
      return Color.Green;
    case "good":
      return Color.Blue;
    case "fair":
      return Color.Orange;
    case "weak":
      return Color.Red;
    case "out":
      return Color.SecondaryText;
    default: {
      const _exhaustive: never = quality;
      return _exhaustive;
    }
  }
}

export function statusHeadline(network: WifiNetwork): string {
  if (network.current) {
    return `Connected · ${signalLabel(network.rssi)}`;
  }
  if (network.rssi === 0 && network.saved) {
    return "Saved · Not in range";
  }
  if (network.saved) {
    return `Saved · ${signalLabel(network.rssi)}`;
  }
  return signalLabel(network.rssi);
}

export function networkListIcon(network: WifiNetwork): { source: Icon; tintColor: Color } {
  if (network.current) {
    return { source: Icon.Wifi, tintColor: Color.Green };
  }
  if (network.rssi === 0) {
    return { source: Icon.WifiDisabled, tintColor: Color.SecondaryText };
  }
  return { source: Icon.Wifi, tintColor: signalColor(network.rssi) };
}

export type NetworkAccessory = {
  text?: string;
  tag?: string | { value: string; color?: Color };
};

/** Accessories for list rows (tags preferred when detail pane is open). */
export function networkAccessories(
  network: WifiNetwork,
  options?: { downloadLabel?: string; isSpeedTesting?: boolean },
): NetworkAccessory[] {
  const accessories: NetworkAccessory[] = [];

  if (network.current) {
    accessories.push({ tag: { value: "Connected", color: Color.Green } });
  } else if (network.saved) {
    accessories.push({ tag: { value: "Saved", color: Color.Purple } });
  }

  if (options?.isSpeedTesting && network.current) {
    accessories.push({ tag: { value: "Testing…", color: Color.Orange } });
  } else if (options?.downloadLabel && network.current) {
    accessories.push({ tag: { value: `↓ ${options.downloadLabel}`, color: Color.Blue } });
  }

  if (network.rssi !== 0) {
    accessories.push({ tag: { value: signalLabel(network.rssi), color: signalColor(network.rssi) } });
  }

  if (network.channel_band && network.channel_band !== "unknown") {
    accessories.push({ tag: { value: network.channel_band, color: Color.Blue } });
  }

  return accessories;
}

export function formatChannel(network: WifiNetwork): string {
  if (!network.channel) {
    return "—";
  }
  const width = network.channel_width ? ` · ${network.channel_width} MHz` : "";
  return `${network.channel}${width}`;
}

export function displaySsid(network: WifiNetwork): string {
  const trimmed = network.ssid?.trim();
  return trimmed || "Hidden network";
}
