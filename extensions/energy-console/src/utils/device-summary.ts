import type { DeviceSnapshot, PowerFlowState } from "../types/device";
import { getDeviceCategory } from "../devices/catalog";
import {
  escapeMarkdownInline,
  formatBatteryLevel,
  formatPercent,
  formatSupplyPriority,
  formatTemperature,
  formatWatts,
  formatZoneTemperature,
} from "./formatters";

export function buildDeviceSummaryMarkdown(device: DeviceSnapshot): string {
  const category = getDeviceCategory(device.profile.category);
  const lines = [
    `# ${category.emoji} ${escapeMarkdownInline(device.name)}`,
    `**${device.profile.displayName}** · ${category.label}`,
  ];
  const readingCount = Object.keys(device.quotas).length;

  if (!device.online) {
    lines.push("", "This device is offline. EcoFlow does not expose live readings until it reconnects.");
    return lines.join("\n");
  }

  if (device.batteryLevel !== undefined) {
    lines.push("", `# ${formatBatteryLevel(device.batteryLevel)}`, powerFlowText(device.powerFlow));
  } else if (device.switchEnabled !== undefined) {
    lines.push("", `# ${device.switchEnabled ? "On" : "Off"}`);
  } else if (readingCount > 0) {
    lines.push("", "Live device data is available in **View Raw Readings**.");
  } else if (device.quotaError) {
    lines.push("", "Live readings could not be loaded for this device.");
  } else {
    lines.push("", "EcoFlow returned no live readings for this device.");
  }

  if (device.inputWatts !== undefined && device.outputWatts !== undefined) {
    lines.push(
      "",
      "| Input | Output |",
      "| ---: | ---: |",
      `| ${formatWatts(device.inputWatts)} | ${formatWatts(device.outputWatts)} |`,
    );
  } else if (device.inputWatts !== undefined) {
    lines.push("", `**Input:** ${formatWatts(device.inputWatts)}`);
  } else if (device.outputWatts !== undefined) {
    lines.push("", `**Output:** ${formatWatts(device.outputWatts)}`);
  }

  const operationalDetails = buildOperationalDetails(device);
  if (operationalDetails.length > 0) {
    lines.push(
      "",
      "## At a glance",
      "",
      "| | |",
      "| --- | --- |",
      ...operationalDetails.map(([label, value]) => `| **${label}** | ${value} |`),
    );
  }

  if (device.quotaError) lines.push("", `> ${escapeMarkdownInline(device.quotaError)}`);
  return lines.join("\n");
}

function buildOperationalDetails(device: DeviceSnapshot): Array<[string, string]> {
  const rows: Array<[string, string]> = [];

  if (device.operatingMode) {
    rows.push(["Mode", [device.operatingMode, device.operatingSubmode].filter(Boolean).join(" · ")]);
  }
  if (device.fanSpeed) rows.push(["Fan", device.fanSpeed]);
  if (device.temperatureCelsius !== undefined) {
    rows.push([
      "Temperature",
      device.targetTemperatureCelsius === undefined
        ? formatTemperature(device.temperatureCelsius)
        : `${formatTemperature(device.temperatureCelsius)} → ${formatTemperature(device.targetTemperatureCelsius)}`,
    ]);
  }
  if (device.leftTemperatureCelsius !== undefined) {
    rows.push(["Left zone", formatZoneTemperature(device.leftTemperatureCelsius, device.leftTargetTemperatureCelsius)]);
  }
  if (device.rightTemperatureCelsius !== undefined) {
    rows.push([
      "Right zone",
      formatZoneTemperature(device.rightTemperatureCelsius, device.rightTargetTemperatureCelsius),
    ]);
  }
  if (device.supplyPriority) rows.push(["Priority", formatSupplyPriority(device.supplyPriority)]);
  if (device.customLoadWatts !== undefined) rows.push(["Custom load", formatWatts(device.customLoadWatts)]);
  if (device.chargeLimitPercent !== undefined || device.dischargeLimitPercent !== undefined) {
    const batteryWindow =
      device.chargeLimitPercent !== undefined && device.dischargeLimitPercent !== undefined
        ? `${formatPercent(device.dischargeLimitPercent)} to ${formatPercent(device.chargeLimitPercent)}`
        : device.chargeLimitPercent !== undefined
          ? `Charge up to ${formatPercent(device.chargeLimitPercent)}`
          : `Discharge down to ${formatPercent(device.dischargeLimitPercent)}`;
    rows.push(["Battery window", batteryWindow]);
  }
  if (device.ecoModeEnabled !== undefined) rows.push(["Eco mode", device.ecoModeEnabled ? "On" : "Off"]);
  if (device.doorOpen !== undefined) rows.push(["Door", device.doorOpen ? "Open" : "Closed"]);
  if (device.iceMakingState) {
    rows.push([
      "Ice maker",
      device.iceProgressPercent === undefined
        ? device.iceMakingState
        : `${device.iceMakingState} · ${formatPercent(device.iceProgressPercent)}`,
    ]);
  }
  if (device.indicatorBrightnessPercent !== undefined) {
    rows.push(["Indicator", `${formatPercent(device.indicatorBrightnessPercent)} brightness`]);
  }

  return rows;
}

function powerFlowText(state: PowerFlowState): string {
  switch (state) {
    case "charging":
      return "Charging";
    case "discharging":
      return "Discharging";
    case "idle":
      return "Idle";
    case "full":
      return "Full";
    default:
      return "Power flow unknown";
  }
}
