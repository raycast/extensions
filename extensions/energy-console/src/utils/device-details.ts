import { Color, Icon, type Image } from "@raycast/api";
import type { DeviceSnapshot } from "../types/device";
import {
  formatAmps,
  formatHertz,
  formatMinutes,
  formatPercent,
  formatSupplyPriority,
  formatTemperature,
  formatZoneTemperature,
  formatVolts,
  formatWatts,
} from "./formatters";

export interface DeviceDetailRow {
  title: string;
  text: string;
  icon?: Image.ImageLike;
}

export interface DeviceDetailGroup {
  id: "energy" | "configuration" | "operation";
  rows: DeviceDetailRow[];
}

export function getDeviceDetailGroups(device: DeviceSnapshot): DeviceDetailGroup[] {
  const groups: DeviceDetailGroup[] = [
    { id: "energy", rows: getEnergyRows(device) },
    { id: "configuration", rows: getConfigurationRows(device) },
    { id: "operation", rows: getOperationRows(device) },
  ];
  return groups.filter((group) => group.rows.length > 0);
}

function getEnergyRows(device: DeviceSnapshot): DeviceDetailRow[] {
  const rows: DeviceDetailRow[] = [];
  addNumberRow(rows, "Input", device.inputWatts, formatWatts, {
    source: Icon.ArrowDown,
    tintColor: Color.Green,
  });
  addNumberRow(rows, "Output", device.outputWatts, formatWatts, {
    source: Icon.ArrowUp,
    tintColor: Color.Orange,
  });
  addNumberRow(rows, "Solar", device.solarWatts, formatWatts, { source: Icon.Sun, tintColor: Color.Yellow });
  addNumberRow(rows, "Solar Input 1", device.solarInput1Watts, formatWatts, Icon.Sun);
  addNumberRow(rows, "Solar Input 2", device.solarInput2Watts, formatWatts, Icon.Sun);
  addNumberRow(rows, "Grid", device.gridWatts, formatWatts, Icon.Bolt);
  addNumberRow(rows, "Load", device.loadWatts, formatWatts, Icon.House);
  addNumberRow(rows, "Battery Power", device.batteryWatts, formatWatts, Icon.BatteryCharging);
  addNumberRow(rows, "Remaining", device.remainingMinutes, formatMinutes, Icon.Clock);
  addNumberRow(rows, "Temperature", device.temperatureCelsius, formatTemperature, Icon.Temperature);
  addNumberRow(rows, "Target Temperature", device.targetTemperatureCelsius, formatTemperature, Icon.Temperature);
  addNumberRow(rows, "Voltage", device.voltageVolts, formatVolts, Icon.Bolt);
  addNumberRow(rows, "Current", device.currentAmps, formatAmps);
  addNumberRow(rows, "Frequency", device.frequencyHertz, formatHertz);
  return rows;
}

function getConfigurationRows(device: DeviceSnapshot): DeviceDetailRow[] {
  const rows: DeviceDetailRow[] = [];
  addNumberRow(rows, "Charge Limit", device.chargeLimitPercent, formatPercent, Icon.BatteryCharging);
  addNumberRow(rows, "Discharge Limit", device.dischargeLimitPercent, formatPercent, Icon.Battery);
  addNumberRow(rows, "Custom Load", device.customLoadWatts, formatWatts, Icon.Gauge);
  if (device.supplyPriority) {
    rows.push({ title: "Priority", text: formatSupplyPriority(device.supplyPriority), icon: Icon.ArrowRight });
  }
  addNumberRow(rows, "Indicator Brightness", device.indicatorBrightnessPercent, formatPercent, Icon.LightBulb);
  return rows;
}

function getOperationRows(device: DeviceSnapshot): DeviceDetailRow[] {
  const rows: DeviceDetailRow[] = [];
  addTextRow(rows, "Mode", device.operatingMode, Icon.Snowflake);
  addTextRow(rows, "Preset", device.operatingSubmode, Icon.Gauge);
  addTextRow(rows, "Fan", device.fanSpeed);
  addTextRow(rows, "Light Strip", device.lightStripMode, Icon.LightBulb);
  if (device.leftTemperatureCelsius !== undefined) {
    rows.push({
      title: "Left Zone",
      text: formatZoneTemperature(device.leftTemperatureCelsius, device.leftTargetTemperatureCelsius),
      icon: Icon.Temperature,
    });
  }
  if (device.rightTemperatureCelsius !== undefined) {
    rows.push({
      title: "Right Zone",
      text: formatZoneTemperature(device.rightTemperatureCelsius, device.rightTargetTemperatureCelsius),
      icon: Icon.Temperature,
    });
  }
  if (device.ecoModeEnabled !== undefined) {
    rows.push({ title: "Eco Mode", text: device.ecoModeEnabled ? "On" : "Off" });
  }
  if (device.doorOpen !== undefined) rows.push({ title: "Door", text: device.doorOpen ? "Open" : "Closed" });
  if (device.partitionInstalled !== undefined) {
    rows.push({ title: "Temperature Zones", text: device.partitionInstalled ? "Two zones" : "Single zone" });
  }
  addTextRow(rows, "Ice Maker", device.iceMakingState);
  addNumberRow(rows, "Ice Progress", device.iceProgressPercent, formatPercent);
  return rows;
}

function addNumberRow(
  rows: DeviceDetailRow[],
  title: string,
  value: number | undefined,
  formatter: (value: number | undefined) => string,
  icon?: Image.ImageLike,
): void {
  if (value === undefined) return;
  rows.push({ title, text: formatter(value), ...(icon ? { icon } : {}) });
}

function addTextRow(rows: DeviceDetailRow[], title: string, text: string | undefined, icon?: Image.ImageLike): void {
  if (!text) return;
  rows.push({ title, text, ...(icon ? { icon } : {}) });
}
