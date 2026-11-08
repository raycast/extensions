import { existsSync, readdirSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { GROUP_CONTAINERS_DIR, GROUP_CONTAINER_SUFFIX, SNAPSHOT_FILE } from "./constants";
import { parseDate, providerName, windowTitle } from "./format";
import { LimitWindow, ProviderUsage, RawRateWindow } from "./types";

interface SnapshotRow {
  id: string;
  title?: string;
  percentLeft?: number;
  window?: RawRateWindow | null;
}

interface SnapshotEntry {
  provider: string;
  updatedAt?: string;
  primary?: RawRateWindow | null;
  secondary?: RawRateWindow | null;
  tertiary?: RawRateWindow | null;
  usageRows?: SnapshotRow[];
  tokenUsage?: {
    currencyCode?: string;
    sessionCostUSD?: number;
    sessionTokens?: number;
    last30DaysCostUSD?: number;
    last30DaysTokens?: number;
  } | null;
}

interface WidgetSnapshot {
  enabledProviders?: string[];
  entries?: SnapshotEntry[];
  generatedAt?: string;
}

export class SnapshotNotFoundError extends Error {
  constructor() {
    super("CodexBar has not written any usage data yet");
    this.name = "SnapshotNotFoundError";
  }
}

/** Locates `widget-snapshot.json` inside the `<TEAMID>.com.steipete.codexbar` Group Container. */
export function findSnapshotPath(groupContainersDir: string = GROUP_CONTAINERS_DIR): string | undefined {
  let entries: string[];
  try {
    entries = readdirSync(groupContainersDir);
  } catch {
    return undefined;
  }
  for (const entry of entries.filter((name) => name.endsWith(GROUP_CONTAINER_SUFFIX)).sort()) {
    const candidate = join(groupContainersDir, entry, SNAPSHOT_FILE);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

const STANDARD_WINDOWS = ["primary", "secondary", "tertiary"] as const;
type StandardWindow = (typeof STANDARD_WINDOWS)[number];

function isStandardWindow(id: string): id is StandardWindow {
  return (STANDARD_WINDOWS as readonly string[]).includes(id);
}

/** Rows whose app title is a localized period name ("Mensile", "Settimanale"), not a model scope. */
const PERIOD_ROW_IDS = new Set<string>([...STANDARD_WINDOWS, "session", "daily", "weekly", "monthly"]);

function toLimitWindow(id: string, title: string, raw: RawRateWindow | null | undefined, fallbackUsed?: number) {
  const usedPercent = typeof raw?.usedPercent === "number" ? raw.usedPercent : fallbackUsed;
  if (usedPercent === undefined) return undefined;
  const window: LimitWindow = {
    id,
    title,
    usedPercent,
    resetsAt: parseDate(raw?.resetsAt),
    windowMinutes: raw?.windowMinutes ?? undefined,
  };
  return window;
}

function entryWindows(entry: SnapshotEntry): LimitWindow[] {
  const windows: LimitWindow[] = [];
  if (entry.usageRows && entry.usageRows.length > 0) {
    for (const row of entry.usageRows) {
      const raw = row.window ?? (isStandardWindow(row.id) ? entry[row.id] : undefined);
      const fallbackUsed = typeof row.percentLeft === "number" ? 100 - row.percentLeft : undefined;
      const title = PERIOD_ROW_IDS.has(row.id)
        ? windowTitle(raw?.windowMinutes ?? undefined, row.title ?? row.id)
        : (row.title ?? row.id);
      const window = toLimitWindow(row.id, title, raw, fallbackUsed);
      if (window) windows.push(window);
    }
    return windows;
  }
  for (const id of STANDARD_WINDOWS) {
    const raw = entry[id];
    const window = toLimitWindow(id, windowTitle(raw?.windowMinutes ?? undefined, id), raw);
    if (window) windows.push(window);
  }
  return windows;
}

export function parseSnapshot(snapshot: WidgetSnapshot): ProviderUsage[] {
  return (snapshot.entries ?? []).map((entry) => ({
    provider: entry.provider,
    name: providerName(entry.provider),
    windows: entryWindows(entry),
    todayCost: entry.tokenUsage?.sessionCostUSD,
    todayTokens: entry.tokenUsage?.sessionTokens,
    last30DaysCost: entry.tokenUsage?.last30DaysCostUSD,
    last30DaysTokens: entry.tokenUsage?.last30DaysTokens,
    currency: entry.tokenUsage?.currencyCode ?? "USD",
    updatedAt: parseDate(entry.updatedAt ?? snapshot.generatedAt),
    source: "app" as const,
  }));
}

export interface SnapshotData {
  providers: ProviderUsage[];
  /** Providers enabled in CodexBar, when the snapshot lists them. */
  enabledProviders?: string[];
}

export async function readSnapshot(path: string | null = findSnapshotPath() ?? null): Promise<SnapshotData> {
  if (!path) throw new SnapshotNotFoundError();
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new SnapshotNotFoundError();
  }
  const snapshot = JSON.parse(text) as WidgetSnapshot;
  return {
    providers: parseSnapshot(snapshot),
    enabledProviders: Array.isArray(snapshot.enabledProviders) ? snapshot.enabledProviders : undefined,
  };
}
