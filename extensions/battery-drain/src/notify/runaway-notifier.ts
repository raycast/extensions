import { LocalStorage } from "@raycast/api";
import { appleScriptString, newRunaways, NotifiedEntry, processStart, recordNotified } from "../analysis/notify";
import { Runaway } from "../analysis/runaway";
import { run } from "../collectors/exec";
import { formatDuration } from "../render/format";
import { Snapshot } from "../types";

const NOTIFIED_KEY = "notified.v2";

function isEntry(v: unknown): v is NotifiedEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.pid === "number" && typeof e.at === "number" && (e.start === undefined || typeof e.start === "number")
  );
}

async function loadNotified(): Promise<NotifiedEntry[]> {
  try {
    const parsed: unknown = JSON.parse((await LocalStorage.getItem<string>(NOTIFIED_KEY)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/** Posts one macOS notification per new runaway; the menu bar runs every two minutes, so the list is persisted. */
export async function notifyNewRunaways(runaways: Runaway[], snapshot: Snapshot): Promise<void> {
  const startOf = (pid: number) => processStart(snapshot.t, snapshot.processInfo.get(pid));
  const entries = await loadNotified();
  const fresh = newRunaways(runaways, entries, startOf);
  // Record before posting: if the command is unloaded mid-way, a skipped notification beats a repeated one.
  // Written only when something changed: nothing new and nothing expired leaves the same list.
  const next = recordNotified(entries, fresh, startOf, snapshot.t);
  if (fresh.length > 0 || next.length !== entries.length)
    await LocalStorage.setItem(NOTIFIED_KEY, JSON.stringify(next));
  for (const r of fresh) {
    const message = `${r.command} has used ${Math.round(r.cpu)}% CPU for ${formatDuration(r.sinceSec)}`;
    await run("/usr/bin/osascript", [
      "-e",
      `display notification ${appleScriptString(message)} with title ${appleScriptString("Battery Drain: runaway process")}`,
    ]);
  }
}
