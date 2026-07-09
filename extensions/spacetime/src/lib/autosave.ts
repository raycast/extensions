import { getPreferenceValues } from "@raycast/api";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Preferences, Session } from "./types";
import { sessionCsvFilename, sessionToCsv } from "./csv";
import { sessionTotalSeconds } from "./format";

/**
 * When "Save Sessions to Disk" is enabled, writes a stopped session to the
 * configured folder (or ~/Downloads if none is set) as a CSV. Returns the
 * written path, or undefined when the feature is off or there is nothing to
 * save. Never throws — auto-save must not break stopping a session.
 */
export async function autoSaveSession(session: Session): Promise<string | undefined> {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.autoSaveSessions) return undefined;
  if (sessionTotalSeconds(session) <= 0) return undefined; // nothing recorded yet

  try {
    const base = prefs.autoSaveDirectory?.trim() || join(homedir(), "Downloads");
    // Optionally nest under a <year>/<month> folder structure, e.g. 2026/07/…
    let dir = base;
    if (prefs.autoSaveSubfolders) {
      const d = new Date(session.startedAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      dir = join(base, String(d.getFullYear()), pad(d.getMonth() + 1));
    }
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const path = join(dir, sessionCsvFilename(session));
    writeFileSync(path, sessionToCsv(session), "utf8");
    return path;
  } catch {
    return undefined;
  }
}
