import { Color, Icon } from "@raycast/api";

import type { Port, USBDevice } from "./types";

const GAUGE_WATTS = [0, 30, 45, 65, 67, 70, 96, 100, 140] as const;

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+!|])/g, "\\$1");
}

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

/** Negotiated / displayed watts for the gauge; empty ports are 0. */
export function extractNegotiatedWatts(port: Port): number {
  if (!port.connectionActive) {
    return 0;
  }
  const parsed = firstMatchWatts(port.charging?.summary, port.headline, port.status, port.charging?.detail);
  if (parsed != null) {
    return parsed;
  }
  if (port.cable?.maxWatts != null) {
    return port.cable.maxWatts;
  }
  return 0;
}

/** Snap to the nearest pre-rendered gauge asset. */
export function gaugeAssetForWatts(watts: number): string {
  let best: (typeof GAUGE_WATTS)[number] = GAUGE_WATTS[0];
  let bestDelta = Math.abs(watts - best);
  for (const candidate of GAUGE_WATTS) {
    const delta = Math.abs(watts - candidate);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return `gauge-${best}.png`;
}

function extractNegotiatedPower(port: Port): string | null {
  const sources = [port.charging?.detail, port.charging?.summary, port.headline];
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(/(\d+(?:\.\d+)?)\s*V\s*(?:@|at)\s*(\d+(?:\.\d+)?)\s*A/i);
    if (match) {
      return `${match[1]}V @ ${match[2]}A`;
    }
  }
  const watts = extractNegotiatedWatts(port);
  if (watts > 0 && port.connectionActive) {
    return `${watts}W negotiated`;
  }
  return null;
}

function cableQuality(port: Port): string | null {
  const cable = port.cable;
  if (!cable) {
    return null;
  }
  if (cable.certification?.listings?.length) {
    const rating = cable.currentRating ? ` (${cable.currentRating})` : cable.maxWatts != null ? ` (${cable.maxWatts}W)` : "";
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

function heroTitle(port: Port): string {
  if (!port.connectionActive) {
    return "Empty";
  }
  if (port.charging?.isWarning) {
    const watts = extractNegotiatedWatts(port);
    return watts > 0 ? `Slow Charging · ${watts}W` : "Slow Charging";
  }
  const watts = extractNegotiatedWatts(port);
  if (port.charging && watts > 0) {
    return `Charging · ${watts}W`;
  }
  const speed = dataSpeed(port);
  if (speed !== "N/A") {
    return `${port.headline.split("·")[0]?.trim() || "Data"} · ${speed}`;
  }
  return port.headline;
}

function heroBody(port: Port): string | null {
  if (!port.connectionActive) {
    return "No cable or accessory on this port.";
  }
  if (port.charging?.detail) {
    return port.charging.detail;
  }
  if (port.dataLink?.detail) {
    return port.dataLink.detail;
  }
  return null;
}

function formatDevices(devices: USBDevice[], indent = 0): string[] {
  const pad = "  ".repeat(indent);
  const lines: string[] = [];
  for (const device of devices) {
    const label = device.name || device.vendorName || `VID ${device.vendorID.toString(16)}`;
    lines.push(`${pad}- ${escapeMarkdown(label)} (${escapeMarkdown(device.speed)})`);
    if (device.children?.length) {
      lines.push(...formatDevices(device.children, indent + 1));
    }
  }
  return lines;
}

/** Compact markdown for the list detail pane (port title lives in the list). */
export function portListDetailMarkdown(port: Port): string {
  const watts = extractNegotiatedWatts(port);
  const gauge = gaugeAssetForWatts(watts);
  const sections: string[] = [
    `![${watts} watts](${gauge})`,
    "",
    `**${escapeMarkdown(heroTitle(port))}**`,
    "",
  ];

  if (port.subtitle) {
    sections.push(escapeMarkdown(port.subtitle), "");
  }

  const body = heroBody(port);
  if (body) {
    sections.push(escapeMarkdown(body), "");
  }

  if (port.displays?.length) {
    sections.push("## Displays");
    for (const display of port.displays) {
      const title = display.monitorName ? escapeMarkdown(display.monitorName) : "Display";
      sections.push(`### ${title}`, escapeMarkdown(display.summary), "");
    }
  }

  if (port.devices?.length) {
    sections.push("## Connected devices", ...formatDevices(port.devices), "");
  }

  return sections.join("\n").trim() + "\n";
}

export type PortAccessory = {
  text?: string;
  tag?: string | { value: string; color?: Color };
  icon?: Icon;
};

/** Single primary accessory for list rows (mockup style). */
export function portAccessories(port: Port): PortAccessory[] {
  if (!port.connectionActive) {
    return [{ tag: { value: "Empty", color: Color.SecondaryText } }];
  }

  if (port.charging?.isWarning) {
    return [{ tag: { value: "Slow Charging", color: Color.Orange } }];
  }

  const watts = extractNegotiatedWatts(port);
  const speed = port.cable?.speed || port.transports?.usb3Speed || null;
  const dataSummary = port.dataLink?.summary ?? "";
  const powerOnly =
    Boolean(port.charging) &&
    watts > 0 &&
    (!speed || /power\s*only|none/i.test(dataSummary) || /charg/i.test(`${port.headline} ${port.status}`));

  if (powerOnly) {
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

export function portListIcon(port: Port): { source: Icon; tintColor: Color } {
  if (!port.connectionActive) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  if (port.charging?.isWarning) {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  if (port.charging && extractNegotiatedWatts(port) > 0) {
    return { source: Icon.Bolt, tintColor: Color.Blue };
  }
  return { source: Icon.Link, tintColor: Color.Blue };
}

/** Structured fields for List.Item.Detail.Metadata sections. */
export function portDetailFields(port: Port): {
  connected: string;
  capabilities: string | null;
  powerStatus: string | null;
  powerStatusColor?: Color;
  negotiated: string | null;
  cableQuality: string | null;
  dataProtocol: string;
  dataSpeed: string;
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
  };
}
