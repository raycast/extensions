import type { Cable, Port, USBDevice } from "./types";

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+!|])/g, "\\$1");
}

function formatCable(cable: Cable): string[] {
  const lines: string[] = ["## Cable"];
  const identityBits = [
    cable.curatedBrands?.length ? cable.curatedBrands.join(" / ") : null,
    cable.vendorName,
    cable.speed,
    cable.currentRating,
    cable.maxWatts != null ? `${cable.maxWatts}W` : null,
    cable.type,
  ].filter(Boolean);
  if (identityBits.length) {
    lines.push(identityBits.map((bit) => escapeMarkdown(String(bit))).join(" · "));
  }
  if (cable.certification?.listings?.length) {
    const listing = cable.certification.listings[0];
    lines.push(`USB-IF certified: ${escapeMarkdown(listing.company)} — ${escapeMarkdown(listing.model)}`);
  } else if (cable.certID) {
    lines.push(`Carries USB-IF certification ID ${escapeMarkdown(cable.certID)} (not in the public registry)`);
  }
  if (cable.trustFlags?.length) {
    lines.push("", "### Trust signals");
    for (const flag of cable.trustFlags) {
      lines.push(`- **${escapeMarkdown(flag.title)}** — ${escapeMarkdown(flag.detail)}`);
    }
  }
  return lines;
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
  const sections: string[] = [`**${escapeMarkdown(port.headline)}**`, ""];

  if (port.subtitle) {
    sections.push(escapeMarkdown(port.subtitle), "");
  }

  if (port.charging?.detail) {
    sections.push("## Charging", escapeMarkdown(port.charging.detail), "");
  }

  if (port.dataLink?.detail) {
    sections.push("## Data", escapeMarkdown(port.dataLink.detail), "");
  }

  if (port.cable) {
    sections.push(...formatCable(port.cable), "");
  }

  if (port.displays?.length) {
    sections.push("## Displays");
    for (const display of port.displays) {
      const title = display.monitorName ? escapeMarkdown(display.monitorName) : "Display";
      sections.push(`### ${title}`, escapeMarkdown(display.summary), "", escapeMarkdown(display.detail), "");
    }
  }

  if (port.devices?.length) {
    sections.push("## Connected devices", ...formatDevices(port.devices), "");
  }

  if (port.bullets?.length) {
    sections.push("## Summary");
    for (const bullet of port.bullets) {
      sections.push(`- ${escapeMarkdown(bullet)}`);
    }
    sections.push("");
  }

  return sections.join("\n").trim() + "\n";
}

export function portAccessories(port: Port): { text?: string; tag?: string }[] {
  const accessories: { text?: string; tag?: string }[] = [];
  accessories.push({ text: port.headline });
  if (port.cable?.maxWatts != null) {
    accessories.push({ tag: `${port.cable.maxWatts}W` });
  }
  if (port.cable?.speed) {
    accessories.push({ tag: port.cable.speed });
  } else if (port.transports?.usb3Speed) {
    accessories.push({ tag: port.transports.usb3Speed });
  }
  return accessories;
}
