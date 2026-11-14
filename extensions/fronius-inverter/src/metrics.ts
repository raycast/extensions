import { formatBoolean, formatEnergy, formatMeasurement, formatPercentage, formatPower } from "./format";
import { FroniusSnapshot, MeterSnapshot } from "./model";

export interface MetricItem {
  label: string;
  value: string;
  icon: string;
}

export interface MetricSection {
  items: MetricItem[];
  title: string;
}

function items(values: Array<MetricItem | null>): MetricItem[] {
  return values.filter((item): item is MetricItem => item !== null);
}

function meterName(meter: MeterSnapshot, total: number): string {
  if (total > 1) return `Smart Meter ${meter.id}`;
  if (meter.location === 0) return "Grid Smart Meter";
  if (meter.location === 1) return "Load Smart Meter";
  return "Smart Meter";
}

export function createMetricSections(snapshot: FroniusSnapshot): MetricSection[] {
  const { site } = snapshot;
  const sections: MetricSection[] = [
    {
      title: "Live Power",
      items: [
        { label: "PV Power", value: formatPower(site.P_PV), icon: "☀" },
        { label: "Load Power", value: formatPower(site.P_Load, true), icon: "⌂" },
        { label: "Grid Power", value: formatPower(site.P_Grid, true), icon: "↔" },
        { label: "Battery Power", value: formatPower(site.P_Akku, true), icon: "▣" },
      ],
    },
    {
      title: "Energy",
      items: items([
        site.E_Day == null ? null : { label: "Energy Today", value: formatEnergy(site.E_Day), icon: "↻" },
        site.E_Year == null ? null : { label: "Energy This Year", value: formatEnergy(site.E_Year), icon: "◷" },
        { label: "Total Energy", value: formatEnergy(site.E_Total), icon: "∑" },
      ]),
    },
    {
      title: "Battery",
      items: items([
        site.StateOfCharge_Relative == null
          ? null
          : { label: "Battery Charge", value: formatPercentage(site.StateOfCharge_Relative), icon: "▰" },
        ...snapshot.storages.flatMap((storage, index) => {
          const prefix = snapshot.storages.length > 1 ? `Battery ${index + 1} ` : "";
          return [
            storage.voltageVolts == null
              ? null
              : {
                  label: `${prefix}Voltage`,
                  value: formatMeasurement(storage.voltageVolts, "V"),
                  icon: "V",
                },
            storage.currentAmps == null
              ? null
              : {
                  label: `${prefix}Current`,
                  value: formatMeasurement(storage.currentAmps, "A"),
                  icon: "I",
                },
            storage.temperatureCelsius == null
              ? null
              : {
                  label: `${prefix}Temperature`,
                  value: formatMeasurement(storage.temperatureCelsius, "°C"),
                  icon: "T",
                },
            storage.maximumCapacityWattHours == null
              ? null
              : {
                  label: `${prefix}Available Capacity`,
                  value: formatEnergy(storage.maximumCapacityWattHours),
                  icon: "C",
                },
          ];
        }),
      ]),
    },
    ...snapshot.meters.map((meter) => ({
      title: meterName(meter, snapshot.meters.length),
      items: items([
        meter.powerWatts == null
          ? null
          : { label: "Meter Power", value: formatPower(meter.powerWatts, true), icon: "P" },
        meter.frequencyHertz == null
          ? null
          : { label: "Grid Frequency", value: formatMeasurement(meter.frequencyHertz, "Hz", 2), icon: "f" },
        meter.voltageAverageVolts == null
          ? null
          : { label: "Average Phase Voltage", value: formatMeasurement(meter.voltageAverageVolts, "V"), icon: "V" },
      ]),
    })),
    ...snapshot.ohmpilots.map((ohmpilot, index) => ({
      title: snapshot.ohmpilots.length > 1 ? `Ohmpilot ${index + 1}` : "Ohmpilot",
      items: items([
        ohmpilot.powerWatts == null
          ? null
          : { label: "Current Power", value: formatPower(ohmpilot.powerWatts), icon: "P" },
        ohmpilot.energyWattHours == null
          ? null
          : { label: "Total Energy", value: formatEnergy(ohmpilot.energyWattHours), icon: "∑" },
        ohmpilot.temperatureCelsius == null
          ? null
          : { label: "Temperature", value: formatMeasurement(ohmpilot.temperatureCelsius, "°C"), icon: "T" },
      ]),
    })),
    ...(snapshot.ohmpilotEnergy !== null && snapshot.ohmpilots.every((ohmpilot) => ohmpilot.energyWattHours === null)
      ? [
          {
            title: "Ohmpilot Energy",
            items: [{ label: "All Devices", value: formatEnergy(snapshot.ohmpilotEnergy), icon: "∑" }],
          },
        ]
      : []),
    {
      title: "System",
      items: items([
        { label: "Autonomy", value: formatPercentage(site.rel_Autonomy), icon: "◎" },
        { label: "Self Consumption", value: formatPercentage(site.rel_SelfConsumption), icon: "◉" },
        { label: "Backup Mode", value: formatBoolean(site.BackupMode, "Enabled", "Disabled"), icon: "◇" },
        {
          label: "Battery Standby",
          value: formatBoolean(site.BatteryStandby, "Active", "Inactive"),
          icon: "◌",
        },
        snapshot.apiVersion
          ? {
              label: "Solar API",
              value: `v${snapshot.apiVersion.APIVersion} · ${snapshot.apiVersion.CompatibilityRange}`,
              icon: "API",
            }
          : null,
        snapshot.powerFlowVersion
          ? { label: "Power Flow Data", value: `Version ${snapshot.powerFlowVersion}`, icon: "PF" }
          : null,
      ]),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}
