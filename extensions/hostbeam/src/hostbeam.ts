// What the extension knows about Hostbeam, in one place.
//
// The Mac app owns its config; this only ever reads it. Two things make that
// enough for most of what a launcher needs: the file lists the hosts and the
// last beams (with their thumbnails), and `hostbeam://beam` starts a beam
// without the extension having to know anything about SSH.

import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";

/** The app's durable store — the same file Preferences writes. */
export const CONFIG_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "com.hostbeam.app",
  "config.json",
);

/** The app's bundle id, used instead of its name so a stray build elsewhere
 *  on disk cannot answer for it. */
export const BUNDLE_ID = "com.hostbeam.app";

const run = promisify(execFile);

/** Bring Hostbeam up, handing it `files` if there are any. Null when it did;
 *  otherwise what to tell the user, in a HUD — Raycast's window is already
 *  closed by then, since the popover needs the focus.
 *
 *  `open` fails for more than one reason, so each is named: Hostbeam removed
 *  with its config left behind (which is all the commands read), or a file
 *  that moved between being selected and being handed over — saying "not
 *  installed" for that one sent people looking for the wrong problem.
 *
 *  Plain `open`, not the scheme, so it needs no permission from the app. By
 *  bundle id, not by name: a build sitting in a downloads folder must not be
 *  able to answer for the installed app.
 */
export async function openHostbeam(
  files: string[] = [],
): Promise<string | null> {
  try {
    await run("open", ["-b", BUNDLE_ID, ...files]);
    return null;
  } catch (e) {
    if (installedVersion() === null)
      return "Hostbeam is not installed on this Mac";
    const gone = files.find((f) => !existsSync(f));
    if (gone) return `${basename(gone)} is no longer there`;
    const why = String((e as { stderr?: unknown }).stderr ?? "")
      .trim()
      .split("\n")[0];
    return why || "Hostbeam could not be opened";
  }
}

export interface RecentBeam {
  id: string;
  hostId: string;
  hostName?: string;
  /** The remote path — what a copy hands you. */
  path: string;
  at: number;
  /** The preview the app shows: the path of a file in the app's cache since
   *  Hostbeam 0.1.27, a data URL in rows written before. Absent when it was
   *  trimmed to keep the app's cache in budget, or the format had no decoder. */
  thumb?: string | null;
  /** Rows sharing this arrived in one gesture. */
  group?: string;
}

export interface HostbeamConfig {
  addedIds?: string[];
  defaultId?: string | null;
  recent?: RecentBeam[];
  manualHosts?: { id: string; name?: string }[];
  settings?: {
    sentence?: string;
    copySentence?: boolean;
    /** Saved since "just the path" became the app's default (2026-09-28). */
    pathDefault?: boolean;
    /** Preferences → General → Beaming → "Let other apps control Hostbeam".
     *  On by default since Hostbeam 0.1.26, so a missing key means allowed;
     *  only a saved `false` refuses. This extension is one of the "other apps". */
    allowUrlBeam?: boolean;
  };
}

/** The config, or null when Hostbeam is not installed or has never run. */
export function readConfig(): HostbeamConfig | null {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as HostbeamConfig;
  } catch {
    return null;
  }
}

/** The sentence Hostbeam suggests, and its default until 2026-09-28. */
const SUGGESTED_SENTENCE = "Use this screenshot: {path}";
/** What the suggested sentence says for a file that is not a picture. */
const FILE_SENTENCE = "Use this file: {path}";
const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "heic",
  "heif",
  "avif",
  "tif",
  "tiff",
  "bmp",
]);

/** Whether a beam puts the sentence around the path. Off by default since
 *  2026-09-28; a config saved before then with it on and the sentence
 *  untouched was nobody's choice and reads as off, as in the app. */
function copiesSentence(cfg: HostbeamConfig | null): boolean {
  const s = cfg?.settings;
  if (!s?.copySentence) return false;
  return Boolean(s.pathDefault) || (s.sentence ?? "") !== SUGGESTED_SENTENCE;
}

/** The paste-ready text for one or more remote paths — exactly what the app
 *  put on the clipboard for them (its `render_sentence`), so a copy from here
 *  and a copy from the app's own Recent list give you the same thing. Just the
 *  paths by default, a space apart: a lone path is what coding agents attach
 *  as the picture itself, and Claude Code and Gemini CLI split a paste at
 *  spaces. With the sentence on, one sentence per line. */
export function sentenceFor(
  cfg: HostbeamConfig | null,
  paths: string[],
): string {
  const template = cfg?.settings?.sentence ?? "";
  if (!(copiesSentence(cfg) && template.includes("{path}")))
    return paths.join(" ");
  const one = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const tpl =
      template === SUGGESTED_SENTENCE && !IMAGE_EXTENSIONS.has(ext)
        ? FILE_SENTENCE
        : template;
    return tpl.split("{path}").join(path);
  };
  return paths.map(one).join("\n");
}

/** Rows of one gesture, newest first — grouping *adjacent* rows that share a
 *  `group`, which is how the app itself groups them. */
export function groupRecent(rows: RecentBeam[]): RecentBeam[][] {
  const out: RecentBeam[][] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (last && row.group && last[0].group === row.group) last.push(row);
    else out.push([row]);
  }
  return out;
}

/** The installed app's version, or null if it cannot be found.
 *
 *  Read from the bundle rather than from the config: the config's
 *  `lastVersion` is the version whose release notes were last shown, which
 *  lags the installed one and would refuse commands that work. `/Applications`
 *  first because that is where both the dmg and the Homebrew cask put it;
 *  Spotlight answers for anywhere else.
 */
export function installedVersion(): string | null {
  const read = (app: string) => {
    const plist = join(app, "Contents", "Info.plist");
    const out = execFileSync(
      "plutil",
      ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", plist],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return out.trim() || null;
  };
  try {
    return read("/Applications/Hostbeam.app");
  } catch {
    /* installed somewhere else, or not at all */
  }
  try {
    const found = execFileSync(
      "mdfind",
      [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .split("\n")
      .find((line) => line.trim().endsWith(".app"));
    return found ? read(found.trim()) : null;
  } catch {
    return null;
  }
}

/** Whether `version` is at least `minimum`, comparing the numbers in each.
 *  An unreadable version answers yes: refusing to work because a check could
 *  not be made is worse than letting the app ignore a link it does not know. */
export function atLeast(version: string | null, minimum: string): boolean {
  if (!version) return true;
  const parts = (v: string) =>
    v.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const [have, want] = [parts(version), parts(minimum)];
  for (let i = 0; i < Math.max(have.length, want.length); i++) {
    const [a, b] = [have[i] ?? 0, want[i] ?? 0];
    if (a !== b) return a > b;
  }
  return true;
}

/** The last segment of a remote path; remote paths are posix. */
export function fileName(path: string): string {
  return path.split("/").pop() || path;
}
