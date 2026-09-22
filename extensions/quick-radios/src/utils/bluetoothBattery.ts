import type { BluetoothBattery } from "../services/types";

export function normalizeBatteryPercent(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace("%", "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return undefined;
  return Math.round(parsed);
}

export function compactBluetoothBattery(
  battery: Partial<Record<keyof BluetoothBattery, unknown>>,
): BluetoothBattery | undefined {
  const normalized: BluetoothBattery = {};
  for (const key of ["level", "left", "right", "case"] as const) {
    const value = normalizeBatteryPercent(battery[key]);
    if (value !== undefined) normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function getBluetoothBatteryParts(
  battery?: BluetoothBattery,
): Array<{ label?: string; value: number }> {
  if (!battery) return [];

  const components = [
    { label: "L", value: battery.left },
    { label: "R", value: battery.right },
    { label: "Case", value: battery.case },
  ].filter(
    (part): part is { label: string; value: number } =>
      part.value !== undefined,
  );
  if (components.length > 0) return components;

  return battery.level === undefined ? [] : [{ value: battery.level }];
}

export function formatBluetoothBattery(battery?: BluetoothBattery): string {
  return getBluetoothBatteryParts(battery)
    .map(({ label, value }) => `${label ? `${label} ` : ""}${value}%`)
    .join(" · ");
}
