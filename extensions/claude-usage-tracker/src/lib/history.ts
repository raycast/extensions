import { readFile } from "fs/promises";
import { join } from "path";
import { HISTORY_DIR } from "./constants";
import { clampPercent, cocoaDate } from "./format";
import { HistoryEntry } from "./types";

const MODELS: { key: string; title: string }[] = [
  { key: "opus", title: "Opus" },
  { key: "sonnet", title: "Sonnet" },
  { key: "fable", title: "Fable" },
  { key: "design", title: "Design" },
];

/** Parses a `usageHistory_<profile>.json` file: one snapshot per reset, newest first. */
export function parseHistory(json: unknown): HistoryEntry[] {
  const snapshots = (json as { snapshots?: unknown } | null)?.snapshots;
  if (!Array.isArray(snapshots)) return [];
  const seen = new Set<string>();
  const entries: HistoryEntry[] = [];
  for (const raw of snapshots as Record<string, unknown>[]) {
    if (typeof raw !== "object" || raw === null) continue;
    const kind = raw.resetType === "sessionReset" ? "session" : raw.resetType === "weeklyReset" ? "weekly" : undefined;
    const at = cocoaDate(raw.triggeringResetTime) ?? cocoaDate(raw.timestamp);
    const used = raw[kind === "session" ? "sessionPercentage" : "weeklyPercentage"];
    if (!kind || !at || typeof used !== "number") continue;
    const id = typeof raw.id === "string" ? raw.id : `${kind}-${at.getTime()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const models =
      kind === "weekly"
        ? MODELS.flatMap((model) => {
            const share = raw[`${model.key}WeeklyPercentage`];
            return typeof share === "number" && share > 0
              ? [{ title: model.title, usedPercent: clampPercent(share) }]
              : [];
          })
        : [];
    entries.push({ id, kind, at, usedPercent: clampPercent(used), models });
  }
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** Profile ids end up in a file name, so anything that is not a plain UUID is refused. */
const PROFILE_ID = /^[0-9A-Fa-f-]{1,64}$/;

export async function readHistory(profileId: string, dir: string | null = HISTORY_DIR): Promise<HistoryEntry[]> {
  if (!dir || !PROFILE_ID.test(profileId)) return [];
  let text: string;
  try {
    text = await readFile(join(dir, `usageHistory_${profileId}.json`), "utf8");
  } catch (error) {
    // No file yet simply means no window has reset since the profile was created.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return parseHistory(JSON.parse(text));
}

/** Average share used at reset, rounded; undefined when there is nothing to average. */
export function averageUsed(entries: HistoryEntry[]): number | undefined {
  if (entries.length === 0) return undefined;
  return Math.round(entries.reduce((sum, entry) => sum + entry.usedPercent, 0) / entries.length);
}
