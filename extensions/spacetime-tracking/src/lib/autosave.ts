import { getPreferenceValues } from "@raycast/api";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Session } from "./types";
import { sessionCsvFilename, sessionToCsv } from "./csv";
import { sessionTotalSeconds } from "./format";

/**
 * The path an auto-saved CSV would occupy for this session. Deterministic from
 * the session's start time, so it stays stable across stop/resume cycles.
 */
function autoSaveTargetPath(session: Session): string {
  const prefs = getPreferenceValues<Preferences>();
  const base = prefs.autoSaveDirectory?.trim() || join(homedir(), "Downloads");
  // Optionally nest under a <year>/<month> folder structure, e.g. 2026/07/…
  let dir = base;
  if (prefs.autoSaveSubfolders) {
    const d = new Date(session.startedAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    dir = join(base, String(d.getFullYear()), pad(d.getMonth() + 1));
  }
  return join(dir, sessionCsvFilename(session));
}

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
    const path = autoSaveTargetPath(session);
    const dir = join(path, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path, sessionToCsv(session), "utf8");
    return path;
  } catch {
    return undefined;
  }
}

/**
 * Removes a previously auto-saved CSV for this session, if one exists. Used
 * when a stopped session is resumed so its on-disk export doesn't linger until
 * the session is stopped (and re-exported) again. Never throws.
 */
export async function deleteAutoSavedSession(session: Session): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.autoSaveSessions) return;
  try {
    rmSync(autoSaveTargetPath(session), { force: true });
  } catch {
    // best-effort cleanup — ignore
  }
}
