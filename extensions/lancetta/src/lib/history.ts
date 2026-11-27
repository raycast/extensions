import { lancettaExport } from "./lancetta";

/**
 * `Lancetta history --json`: each watched agent's current windows with the readings the app
 * recorded in each and in the window before it. The app decides what one window is (one
 * account, one route, a reset that drifts), so the charts draw these as they are and the
 * extension keeps no rule of its own about the history files.
 */
export type Point = { at: number; used: number };

type ExportedPoint = { at: number; usedPercent: number };

export type HistoryWindow = {
  /** `fiveHour`, `sevenDay`, or a model's id as `usage.json`'s `models` gives it. */
  window: string;
  /** The span it measures, in seconds. */
  length: number;
  resetsAt: number;
  /** Oldest first; one can sit before the opening, by up to half a window. */
  readings: ExportedPoint[];
  previous: { resetsAt: number; readings: ExportedPoint[] } | null;
};

type HistoryDocument = {
  schema: number;
  asOf: number;
  agents: { agent: string; route: string | null; windows: HistoryWindow[] }[];
};

/** What a window is called in the export: its two names, or a model's own week by id. */
export type WindowKey = { kind: "sevenDay" } | { kind: "fiveHour" } | { kind: "model"; id: string };

/** Every watched agent's windows, from one run of the command. */
export async function loadHistory(): Promise<Record<string, HistoryWindow[]>> {
  const document = await lancettaExport<HistoryDocument>(["history"]);
  return Object.fromEntries(document.agents.map((a) => [a.agent, a.windows]));
}

const windowOf = (windows: HistoryWindow[], key: WindowKey) =>
  windows.find((w) => w.window === (key.kind === "model" ? key.id : key.kind));

/** The readings of the window, from `opensAt` to `now`: the export's can start before the opening. */
export function windowSeries(windows: HistoryWindow[], key: WindowKey, opensAt: number, now: number): Point[] {
  return (windowOf(windows, key)?.readings ?? [])
    .filter((r) => r.at >= opensAt && r.at <= now)
    .map((r) => ({ at: r.at, used: r.usedPercent }));
}

/**
 * The window before this one, moved forward by one span so it draws over this one. Empty when
 * the previous window was not recorded.
 */
export function previousSeries(windows: HistoryWindow[], key: WindowKey): Point[] {
  const window = windowOf(windows, key);
  return (window?.previous?.readings ?? []).map((r) => ({ at: r.at + window!.length, used: r.usedPercent }));
}
