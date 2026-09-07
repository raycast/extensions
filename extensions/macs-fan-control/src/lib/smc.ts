import { execFile } from "child_process";
import { promisify } from "util";
import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "path";

const exec = promisify(execFile);

export type Fan = {
  index: number;
  actual: number | null;
  min: number | null;
  max: number | null;
  target: number | null;
  /** 0 = system control, 1 = forced to a target speed. */
  mode: number | null;
  /**
   * Location reported by the SMC, e.g. "Left side". Intel Macs publish this as
   * the F<n>ID key; Apple silicon does not, so it is usually null.
   */
  id: string | null;
};

export type Sensor = { key: string; value: number };

export type SmcSnapshot = { fans: Fan[]; sensors: Sensor[] };

/**
 * Read the live SMC state.
 *
 * `smc-reader` is a small read-only helper (source in `native/smc.c`). It only
 * ever issues SMC *read* commands, so it needs no elevated privileges and
 * cannot change how the fans behave.
 */
export async function readSmc(): Promise<SmcSnapshot> {
  const bin = join(environment.assetsPath, "smc-reader");
  const { stdout } = await exec(bin, [], { timeout: 5000 });
  const parsed = JSON.parse(stdout) as SmcSnapshot & { error?: string };
  if (parsed.error) throw new Error(parsed.error);
  return { fans: parsed.fans ?? [], sensors: parsed.sensors ?? [] };
}

/* ------------------------------------------------------------------ */
/* Sensor grouping                                                     */
/* ------------------------------------------------------------------ */

export type SensorGroup = { title: string; peak: number; sensors: Sensor[] };

/**
 * Group raw SMC sensor keys into families a human can read.
 *
 * Apple does not publish these key names, and they differ between Intel and
 * Apple silicon, so this is a best-effort mapping by key prefix. Anything
 * unrecognised still shows up under "Other" rather than being dropped.
 */
const GROUPS: { title: string; match: (key: string) => boolean }[] = [
  { title: "CPU", match: (k) => /^Tp/.test(k) || /^TC[0-9]/.test(k) },
  { title: "GPU", match: (k) => /^TG/.test(k) || /^Tg/.test(k) },
  { title: "Heatsink", match: (k) => k === "TCHP" || /^Th/.test(k) },
  { title: "Mainboard", match: (k) => k === "TCMb" || /^Tm/.test(k) },
  { title: "Battery", match: (k) => /^TB\dT$/.test(k) },
  { title: "Enclosure", match: (k) => /^Ts/.test(k) },
  { title: "Airflow", match: (k) => /^TA/.test(k) },
  { title: "Storage", match: (k) => /^TH/.test(k) },
];

export function groupSensors(sensors: Sensor[]): SensorGroup[] {
  const buckets = new Map<string, Sensor[]>();
  for (const sensor of sensors) {
    const group = GROUPS.find((g) => g.match(sensor.key));
    const title = group?.title ?? "Other";
    const list = buckets.get(title);
    if (list) list.push(sensor);
    else buckets.set(title, [sensor]);
  }

  const order = [...GROUPS.map((g) => g.title), "Other"];
  return [...buckets.entries()]
    .map(([title, list]) => ({
      title,
      peak: Math.max(...list.map((s) => s.value)),
      sensors: list.sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
}

/** The single temperature most worth showing at a glance. */
export function headlineTemperature(sensors: Sensor[]): number | null {
  const groups = groupSensors(sensors);
  const cpu = groups.find((g) => g.title === "CPU");
  if (cpu) return cpu.peak;
  if (sensors.length === 0) return null;
  return Math.max(...sensors.map((s) => s.value));
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

type Prefs = { temperatureUnit?: string };

export function formatTemperature(celsius: number): string {
  const { temperatureUnit } = getPreferenceValues<Prefs>();
  if (temperatureUnit === "fahrenheit") {
    return `${Math.round(celsius * (9 / 5) + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatRpm(rpm: number | null): string {
  return rpm === null ? "—" : `${Math.round(rpm).toLocaleString()} rpm`;
}

/**
 * What to call a fan.
 *
 * Prefers the location the hardware itself reports, so a Mac that knows it has
 * a left and a right fan says so. Falls back to positional numbering, which is
 * what Macs Fan Control shows on machines without those keys.
 */
export function fanLabel(fan: Fan, total: number): string {
  if (fan.id) return fan.id;
  return total === 1 ? "Fan" : `Fan ${fan.index + 1}`;
}

/** Where a fan sits between its minimum and maximum, as 0–1. */
export function fanLoad(fan: Fan): number | null {
  if (fan.actual === null || fan.min === null || fan.max === null) return null;
  if (fan.max <= fan.min) return null;
  return Math.min(1, Math.max(0, (fan.actual - fan.min) / (fan.max - fan.min)));
}
