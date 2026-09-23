import { ChargeState, chargeState, chargingLabel, healthPercent } from "../analysis/battery";
import { drainRate } from "../analysis/drain";
import { BatteryTelemetry, PowerSource, Sample, Snapshot } from "../types";
import { ChartPoint } from "./chart-svg";
import { formatDuration, formatPercent, formatRate, formatWatts } from "./format";

/** One line for the menu bar: charge, time estimate and drain or charging state. */
export function batterySummary(s: Snapshot, history: Sample[]): string | undefined {
  const percent = s.source?.percent ?? s.battery.percent;
  if (percent === undefined) return undefined;

  const minutes = s.source?.minutesRemaining;
  const parts: (string | undefined)[] = [formatPercent(percent)];
  if (s.source?.source === "battery") {
    const rate = drainRate(history);
    parts.push(minutes !== undefined ? `${formatDuration(minutes * 60)} left` : undefined);
    // The drain rate needs ten minutes of battery samples; until then it is left out.
    parts.push(rate !== undefined ? `losing ${formatRate(rate)}` : undefined);
  } else {
    // A short label keeps the menu line narrow; the full explanation is in the tooltip and Diagnose.
    parts.push(chargingLabel(s.battery, s.source));
    // On AC, pmset's estimate is the time until the battery is full.
    parts.push(
      minutes !== undefined && s.source?.state === "charging" ? `${formatDuration(minutes * 60)} to full` : undefined,
    );
  }
  return parts.filter(Boolean).join(" · ");
}

/**
 * The chart's points up to the last full poll. Raycast 1.x blanks a markdown image while it reloads,
 * so charts are redrawn with the process list (every 15 s) rather than with every reading (every 5 s).
 */
export function chartFrame(points: ChartPoint[], until: number | undefined): ChartPoint[] {
  return until === undefined ? points : points.filter((p) => p.t <= until);
}

/** Adds a wattage reading unless it repeats the last one; macOS refreshes telemetry about once a minute. */
export function appendReading(prev: ChartPoint[], point: ChartPoint, max: number): ChartPoint[] {
  if (prev.length > 0 && prev[prev.length - 1].t === point.t) return prev;
  return [...prev, point].slice(-max);
}

/** "top: timeout" entries → "1 data source failed: top"; undefined when all sources worked. */
export function sourceWarning(errors: string[]): string | undefined {
  if (errors.length === 0) return undefined;
  const names = [...new Set(errors.map((e) => e.split(":")[0]))];
  return `${names.length} data source${names.length === 1 ? "" : "s"} failed: ${names.join(", ")}`;
}

/** A process's CPU in every stored sample (matched on pid and command, so a reused pid reads 0), then now. */
export function processCpuSeries(
  history: Sample[],
  p: { pid: number; command: string; cpu: number },
  now: number,
): ChartPoint[] {
  // A sample keeps only the top 10 processes by energy; one that is missing was using too little to
  // make the list, so it reads 0 rather than a gap in the chart.
  const past = history.map((s) => ({
    t: s.t,
    w: s.procs.find((x) => x.pid === p.pid && x.cmd === p.command)?.cpu ?? 0,
  }));
  return [...past, { t: now, w: p.cpu }];
}

export type NowStats = {
  average?: number;
  peak?: number;
  adapter?: number;
  drain?: string;
};

export type DetailRow = { title: string; text: string };

/**
 * The Now detail's labels under the chart. Native metadata rather than markdown tables: Raycast 1.x
 * redrew the tables cell by cell for seconds on every refresh, and live watts refresh every 5 s.
 */
export function nowDetail(s: NowStats, b: BatteryTelemetry): { power: DetailRow[]; battery: DetailRow[] } {
  // No "Now": the row's own title shows it, and the detail has room for only a few labels.
  const power: DetailRow[] = [
    { title: "Average", text: formatWatts(s.average) },
    { title: "Peak", text: formatWatts(s.peak) },
  ];
  if (s.adapter) power.push({ title: "Adapter Input", text: formatWatts(s.adapter) });
  else if (s.drain) power.push({ title: "Battery Drain", text: s.drain });

  // Charge and state sit on the row itself as icons, so the battery adds only its wear here.
  const battery: DetailRow[] = [];
  const health = healthPercent(b);
  const wear = [
    health !== undefined ? formatPercent(health) : undefined,
    b.cycleCount !== undefined ? `${b.cycleCount} cycles` : undefined,
  ].filter(Boolean);
  if (wear.length > 0) battery.push({ title: "Health", text: wear.join(" · ") });
  return { power, battery };
}

export type NowBatteryParts = {
  pluggedIn: boolean; // picks a plain or a charging battery icon, so "on battery" needs no words
  percent: string;
  adapter?: string; // what the power adapter delivers now, e.g. "134 W"
  adapterIsRating?: true; // the value is the charger's rating, not a live reading
  status?: { state: ChargeState; text?: string };
};

/**
 * The Now row's battery part, in icons: a battery whose icon shows whether it is plugged in, the
 * charge, and a state icon. On battery the state icon only appears with a time left to show.
 */
export function nowBatteryParts(b: BatteryTelemetry, s: PowerSource | undefined): NowBatteryParts | undefined {
  const percent = s?.percent ?? b.percent;
  const state = chargeState(b, s);
  if (percent === undefined || state === undefined) return undefined;
  // Live input where macOS reports it (Apple Silicon); otherwise the charger's rating (Intel).
  const adapterW = b.adapterInputW || b.adapterRatedW;
  if (state !== "on-battery") {
    return {
      pluggedIn: true,
      percent: formatPercent(percent),
      adapter: adapterW !== undefined ? `${Math.round(adapterW)} W` : undefined,
      adapterIsRating: !b.adapterInputW && b.adapterRatedW ? true : undefined,
      status: { state, text: undefined },
    };
  }
  const minutes = s?.minutesRemaining;
  return {
    pluggedIn: false,
    percent: formatPercent(percent),
    status: minutes !== undefined ? { state, text: formatDuration(minutes * 60) } : undefined,
  };
}
