import { Color, Icon } from "@raycast/api";

import type { Port, USBDevice } from "./types";

function firstMatchWatts(...sources: Array<string | null | undefined>): number | null {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(/(\d+(?:\.\d+)?)\s*W\b/i);
    if (match) {
      return Math.round(Number(match[1]));
    }
  }
  return null;
}

/** True when the Mac is taking charge (not bus-powering an accessory). */
export function isMacCharging(port: Port): boolean {
  if (!port.connectionActive || !port.charging) {
    return false;
  }
  const summary = port.charging.summary ?? "";
  if (/bus-?powered|not charging|discharg/i.test(summary)) {
    return false;
  }
  if (port.charging.isWarning) {
    return true;
  }
  return /charg/i.test(`${port.status} ${summary} ${port.headline}`);
}

/** Negotiated / displayed watts for the gauge; empty / non-charging ports are 0. */
export function extractNegotiatedWatts(port: Port): number {
  if (!port.connectionActive) {
    return 0;
  }
  const parsed = firstMatchWatts(port.charging?.summary, port.headline, port.status, port.charging?.detail);
  if (parsed != null) {
    if (!isMacCharging(port) && !port.charging?.isWarning) {
      return 0;
    }
    return parsed;
  }
  if (isMacCharging(port) && port.cable?.maxWatts != null) {
    return port.cable.maxWatts;
  }
  return 0;
}

function extractNegotiatedPower(port: Port): string | null {
  if (!isMacCharging(port) && !port.charging?.isWarning) {
    return null;
  }
  const sources = [port.charging?.detail, port.charging?.summary, port.headline];
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(/(\d+(?:\.\d+)?)\s*V\s*(?:@|at)\s*(\d+(?:\.\d+)?)\s*A/i);
    if (match) {
      return `${match[1]}V @ ${match[2]}A`;
    }
  }
  const watts = extractNegotiatedWatts(port);
  if (watts > 0) {
    return `${watts}W`;
  }
  return null;
}

function cableQuality(port: Port): string | null {
  const cable = port.cable;
  if (!cable) {
    return null;
  }
  if (cable.certification?.listings?.length) {
    const rating = cable.currentRating
      ? ` (${cable.currentRating})`
      : cable.maxWatts != null
        ? ` (${cable.maxWatts}W)`
        : "";
    return `Certified${rating}`;
  }
  if (cable.currentRating && cable.maxWatts != null) {
    return `${cable.currentRating}, ${cable.maxWatts}W`;
  }
  if (cable.currentRating) {
    return cable.currentRating;
  }
  if (cable.maxWatts != null) {
    return `${cable.maxWatts}W rated`;
  }
  return cable.type ?? null;
}

function connectedDeviceLabel(port: Port): string {
  if (!port.connectionActive) {
    return "Nothing connected";
  }
  const bits = [port.device?.kind, port.device?.vendorName].filter(Boolean);
  if (bits.length) {
    return bits.join(", ");
  }
  if (port.cable?.vendorName) {
    return port.cable.vendorName;
  }
  return "Connected accessory";
}

function capabilitiesLabel(port: Port): string | null {
  const bits: string[] = [];
  if (port.device?.pdRevision) {
    bits.push(`PD ${port.device.pdRevision}`);
  } else if (port.pdCapable) {
    bits.push("USB-PD");
  }
  if (port.cable?.maxWatts != null) {
    bits.push(`${port.cable.maxWatts}W Max`);
  }
  return bits.length ? bits.join(", ") : null;
}

function dataProtocol(port: Port): string {
  if (!port.connectionActive) {
    return "None";
  }
  if (port.dataLink?.summary) {
    return port.dataLink.summary;
  }
  const active = port.transports?.active?.filter(Boolean) ?? [];
  if (active.length) {
    return active.join(", ");
  }
  return "None (Power Only)";
}

function dataSpeed(port: Port): string {
  if (!port.connectionActive) {
    return "N/A";
  }
  return port.cable?.speed || port.transports?.usb3Speed || "N/A";
}

export function heroTitle(port: Port): string {
  if (!port.connectionActive) {
    return "Empty";
  }
  if (port.charging?.isWarning) {
    const watts = extractNegotiatedWatts(port);
    return watts > 0 ? `Slow Charging · ${watts}W` : "Slow Charging";
  }
  if (isMacCharging(port)) {
    const watts = extractNegotiatedWatts(port);
    return watts > 0 ? `Charging · ${watts}W` : "Charging";
  }
  const speed = dataSpeed(port);
  if (speed !== "N/A") {
    return `${port.headline.split("·")[0]?.trim() || "Data"} · ${speed}`;
  }
  return port.headline;
}

export function statusTagColor(port: Port): Color {
  if (port.charging?.isWarning) {
    return Color.Orange;
  }
  if (isMacCharging(port)) {
    return Color.Green;
  }
  if (!port.connectionActive) {
    return Color.SecondaryText;
  }
  return Color.Blue;
}

function formatDeviceName(device: USBDevice): string {
  return device.name || device.vendorName || `VID ${device.vendorID.toString(16)}`;
}

export function portDetailFields(port: Port): {
  connected: string;
  capabilities: string | null;
  powerStatus: string | null;
  powerStatusColor?: Color;
  negotiated: string | null;
  cableQuality: string | null;
  dataProtocol: string;
  dataSpeed: string;
  deviceNames: string[];
} {
  return {
    connected: connectedDeviceLabel(port),
    capabilities: capabilitiesLabel(port),
    powerStatus: port.charging?.summary ?? (port.connectionActive ? null : "Idle"),
    powerStatusColor: port.charging?.isWarning ? Color.Orange : undefined,
    negotiated: extractNegotiatedPower(port),
    cableQuality: cableQuality(port),
    dataProtocol: dataProtocol(port),
    dataSpeed: dataSpeed(port),
    deviceNames: (port.devices ?? []).map(formatDeviceName),
  };
}

export type PortAccessory = {
  text?: string;
  tag?: string | { value: string; color?: Color };
  icon?: Icon;
};

/** Single primary accessory for list rows. */
export function portAccessories(port: Port): PortAccessory[] {
  if (!port.connectionActive) {
    return [{ tag: { value: "Empty", color: Color.SecondaryText } }];
  }

  if (port.charging?.isWarning) {
    return [{ tag: { value: "Slow Charging", color: Color.Orange } }];
  }

  const watts = extractNegotiatedWatts(port);
  const speed = port.cable?.speed || port.transports?.usb3Speed || null;

  if (isMacCharging(port) && watts > 0) {
    return [{ tag: { value: `${watts}W`, color: Color.Blue } }];
  }
  if (speed) {
    return [{ tag: { value: speed, color: Color.Blue } }];
  }
  if (watts > 0) {
    return [{ tag: { value: `${watts}W`, color: Color.Blue } }];
  }
  return [{ text: port.headline }];
}

function portNumber(port: Port): number | null {
  const match = port.name.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Short list title so MagSafe / USB-C labels stay visible beside the detail pane. */
export function portListTitle(port: Port): string {
  const match = port.name.match(/^Port\s+(\d+)\s*\((.+)\)$/i);
  if (!match) {
    return port.name;
  }
  const [, number, type] = match;
  if (/^USB-C$/i.test(type)) {
    return `USB-C ${number}`;
  }
  if (/^MagSafe/i.test(type)) {
    return type;
  }
  return `${type} ${number}`;
}

export function comparePorts(a: Port, b: Port): number {
  const aNumber = portNumber(a);
  const bNumber = portNumber(b);
  if (aNumber != null && bNumber != null && aNumber !== bNumber) {
    return aNumber - bNumber;
  }
  return a.name.localeCompare(b.name);
}

export function portListIcon(port: Port): { source: Icon; tintColor: Color } {
  if (!port.connectionActive) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  if (port.charging?.isWarning) {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  if (isMacCharging(port)) {
    return { source: Icon.Bolt, tintColor: Color.Green };
  }
  return { source: Icon.Link, tintColor: Color.Blue };
}
