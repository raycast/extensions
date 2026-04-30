import type { EnergyHistoryEntry } from "../tesla";

export type Period = "day" | "week" | "month" | "year";

export function getDateRange(period: Period): { startDate: string; endDate: string } {
  const now = new Date();

  switch (period) {
    case "day": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "week": {
      // Start of current week (Monday)
      const start = new Date(now);
      const day = start.getDay(); // 0=Sun, 1=Mon, ...
      start.setDate(start.getDate() - ((day + 6) % 7));
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "month": {
      // Start of current month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "year": {
      // Start of current year
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
  }
}

export function formatEnergy(wh: number): string {
  const abs = Math.abs(wh);
  if (abs >= 1_000_000) return `${(wh / 1_000_000).toFixed(1)} MWh`;
  if (abs >= 1_000) return `${(wh / 1_000).toFixed(1)} kWh`;
  return `${Math.round(wh)} Wh`;
}

export function formatPower(watts: number): string {
  if (Math.abs(watts) >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

export function formatDate(timestamp: string, period: Period): string {
  const date = new Date(timestamp);
  if (period === "day") {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (period === "week" || period === "month") {
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// --- Aggregation helpers (totals across all entries) ---

// Note: solar-to-battery flow (battery_energy_imported_from_solar) is counted in both
// totalSolarGenerated (as part of total solar produced) and totalBatteryCharged (as part
// of total energy stored). This is intentional — the two totals measure different flows —
// but means the sidebar numbers will not sum to a single total without accounting for this.
export function totalSolarGenerated(entries: EnergyHistoryEntry[]): number {
  return entries.reduce(
    (sum, e) =>
      sum + e.solar_energy_exported + e.consumer_energy_imported_from_solar + e.battery_energy_imported_from_solar,
    0,
  );
}

export function totalHomeUsed(entries: EnergyHistoryEntry[]): number {
  return entries.reduce(
    (sum, e) =>
      sum +
      e.consumer_energy_imported_from_solar +
      e.consumer_energy_imported_from_battery +
      e.consumer_energy_imported_from_grid,
    0,
  );
}

export function totalBatteryDischarged(entries: EnergyHistoryEntry[]): number {
  return entries.reduce((sum, e) => sum + e.battery_energy_exported, 0);
}

export function totalBatteryCharged(entries: EnergyHistoryEntry[]): number {
  return entries.reduce(
    (sum, e) => sum + e.battery_energy_imported_from_solar + e.battery_energy_imported_from_grid,
    0,
  );
}

export function totalGridNet(entries: EnergyHistoryEntry[]): number {
  return entries.reduce(
    (sum, e) => sum + e.grid_energy_imported - e.grid_energy_exported_from_solar - e.grid_energy_exported_from_battery,
    0,
  );
}

// --- Per-entry series helpers (one value per data point, for charts) ---

export function solarPoints(entries: EnergyHistoryEntry[]): number[] {
  return entries.map(
    (e) => e.solar_energy_exported + e.consumer_energy_imported_from_solar + e.battery_energy_imported_from_solar,
  );
}

export function homePoints(entries: EnergyHistoryEntry[]): number[] {
  return entries.map(
    (e) =>
      e.consumer_energy_imported_from_solar +
      e.consumer_energy_imported_from_battery +
      e.consumer_energy_imported_from_grid,
  );
}

export function batteryPoints(entries: EnergyHistoryEntry[]): number[] {
  // Positive = discharging, negative = charging
  return entries.map(
    (e) => e.battery_energy_exported - (e.battery_energy_imported_from_solar + e.battery_energy_imported_from_grid),
  );
}

export function gridPoints(entries: EnergyHistoryEntry[]): number[] {
  // Positive = importing from grid, negative = exporting to grid
  return entries.map(
    (e) => e.grid_energy_imported - (e.grid_energy_exported_from_solar + e.grid_energy_exported_from_battery),
  );
}

// --- Fixed-canvas aggregators ---
// These produce fixed-length arrays aligned to the calendar period, zero-padding
// slots with no data. This gives charts predictable x-axes regardless of when
// they're viewed.

function emptyEntry(): EnergyHistoryEntry {
  return {
    timestamp: "",
    solar_energy_exported: 0,
    grid_energy_imported: 0,
    grid_energy_exported_from_solar: 0,
    grid_energy_exported_from_battery: 0,
    battery_energy_exported: 0,
    battery_energy_imported_from_grid: 0,
    battery_energy_imported_from_solar: 0,
    consumer_energy_imported_from_grid: 0,
    consumer_energy_imported_from_solar: 0,
    consumer_energy_imported_from_battery: 0,
  };
}

function sumInto(target: EnergyHistoryEntry, e: EnergyHistoryEntry): void {
  target.solar_energy_exported += e.solar_energy_exported;
  target.grid_energy_imported += e.grid_energy_imported;
  target.grid_energy_exported_from_solar += e.grid_energy_exported_from_solar;
  target.grid_energy_exported_from_battery += e.grid_energy_exported_from_battery;
  target.battery_energy_exported += e.battery_energy_exported;
  target.battery_energy_imported_from_grid += e.battery_energy_imported_from_grid;
  target.battery_energy_imported_from_solar += e.battery_energy_imported_from_solar;
  target.consumer_energy_imported_from_grid += e.consumer_energy_imported_from_grid;
  target.consumer_energy_imported_from_solar += e.consumer_energy_imported_from_solar;
  target.consumer_energy_imported_from_battery += e.consumer_energy_imported_from_battery;
}

/**
 * Produces exactly 7 entries (Mon–Sun of the current week).
 * Days with no API data are zero-padded.
 * Returns x-labels as single-letter day abbreviations: M T W T F S S
 */
export function aggregateToWeek(entries: EnergyHistoryEntry[]): { buckets: EnergyHistoryEntry[]; xLabels: string[] } {
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((todayDay + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
  const buckets: EnergyHistoryEntry[] = Array.from({ length: 7 }, emptyEntry);

  for (const e of entries) {
    const d = new Date(e.timestamp);
    const diffDays = Math.floor((d.getTime() - monday.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7) {
      sumInto(buckets[diffDays], e);
    }
  }

  return { buckets, xLabels: DAY_LABELS };
}

/**
 * Produces one entry per day of the current month (28–31 slots).
 * Days with no API data are zero-padded.
 * Returns x-labels as day-of-month numbers, shown sparsely (1, 8, 15, 22, last).
 */
export function aggregateToMonth(entries: EnergyHistoryEntry[]): { buckets: EnergyHistoryEntry[]; xLabels: string[] } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const buckets: EnergyHistoryEntry[] = Array.from({ length: daysInMonth }, emptyEntry);

  for (const e of entries) {
    const d = new Date(e.timestamp);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const idx = d.getDate() - 1; // 0-indexed
      sumInto(buckets[idx], e);
    }
  }

  // Sparse labels: show day number only at index 0, 7, 14, 21, and last day
  const xLabels = buckets.map((_, i) => {
    if (i === 0 || i === 6 || i === 13 || i === 20 || i === daysInMonth - 1) return String(i + 1);
    return "";
  });

  return { buckets, xLabels };
}

/**
 * Produces exactly 12 entries (Jan–Dec of the current year).
 * Future months are zero-padded.
 * Returns x-labels as single-letter month abbreviations: J F M A M J J A S O N D
 */
export function aggregateToYear(entries: EnergyHistoryEntry[]): { buckets: EnergyHistoryEntry[]; xLabels: string[] } {
  const year = new Date().getFullYear();
  const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const buckets: EnergyHistoryEntry[] = Array.from({ length: 12 }, emptyEntry);

  for (const e of entries) {
    const d = new Date(e.timestamp);
    if (d.getFullYear() === year) {
      sumInto(buckets[d.getMonth()], e);
    }
  }

  return { buckets, xLabels: MONTH_LABELS };
}
