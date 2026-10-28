// Talks to the Lantern daemon over its Unix socket (one JSON line in, one out; daemon/lantern/api/protocol.py) and
// opens results where the app would: the line in your editor, the moment in QuickTime Player. Nothing leaves the Mac.
import { getDefaultApplication, open, showInFinder, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import type { MusicHit } from "./music";

export const SOCKET = path.join(os.homedir(), "Library", "Application Support", "Lantern", "lantern.sock");

export class NotRunning extends Error {
  constructor() {
    super("Lantern is not running");
  }
}

export function call<T>(method: string, params: Record<string, unknown>, timeoutMs = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const conn = net.createConnection(SOCKET);
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      conn.destroy();
      reject(new Error("Lantern did not answer in time"));
    }, timeoutMs);
    conn.on("connect", () => conn.write(JSON.stringify({ id: 1, method, params }) + "\n"));
    conn.on("data", (data) => {
      chunks.push(data);
      if (!data.includes(10)) return; // the reply ends with a newline
      clearTimeout(timer);
      conn.end();
      try {
        const msg = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result as T);
      } catch (err) {
        reject(err);
      }
    });
    conn.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(err.code === "ENOENT" || err.code === "ECONNREFUSED" ? new NotRunning() : err);
    });
  });
}

/** What the extension needs from Lantern's status to explain itself (service/core.py api_status). */
export interface LanternStatus {
  models_missing?: boolean;
  model_download?: { running: boolean; downloaded_mb?: number; approx_mb?: number; size_mb?: number } | null;
  index_problem?: string | null;
  worker: { running: boolean; stage?: string; done?: number; total?: number };
  files: Record<string, number>;
}
export function status(): Promise<LanternStatus> {
  return call<LanternStatus>("status", {}, 3000);
}

/* Where Lantern can be installed (the .dmg and Homebrew both put it in Applications). */
const APP_PATHS = ["/Applications/Lantern.app", path.join(os.homedir(), "Applications", "Lantern.app")];
export function installedApp(): string | null {
  return APP_PATHS.find((p) => existsSync(p)) ?? null;
}
export const DOWNLOAD_URL = "https://github.com/misterekkk/lantern/releases/latest";

/** Opens the Lantern app; says so when it cannot (moved, deleted) instead of failing silently. */
export async function openLanternApp(): Promise<void> {
  try {
    await open(installedApp() ?? "/Applications/Lantern.app");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Lantern",
      message: String(err instanceof Error ? err.message : err),
    });
  }
}
export const BREW_COMMAND = "brew install --cask misterekkk/tap/lantern";

/* The parts of the search reply this extension shows (service/core.py api_search). */
export interface FileHit {
  chunk_id: number;
  path: string;
  kind: string;
  preview: string;
  start_line: number | null;
  end_line: number | null;
  start_ms: number | null;
  end_ms: number | null;
  page: number | null;
  symbol: string | null;
  date?: string | null; // when the file was made, "2023-05-14" (Lantern 0.2: EXIF, QuickTime, its name, the disk)
  date_source?: string | null; // exif | quicktime | name | fs
  place?: string | null; // the city it was made in, in the system language
  country?: string | null; // ISO code
}

/**
 * "14 May 2023 · Kraków, Poland" for photos and recordings, or any file dated by its contents or name; "" otherwise.
 * The country is named by the system's ICU data, in its language: nothing is looked up online.
 */
export function whenWhere(h: FileHit, visual: boolean): string {
  if (!visual && h.start_ms == null && !["exif", "quicktime", "name"].includes(h.date_source ?? "")) return "";
  const parts: string[] = [];
  const day = h.date ? new Date(`${h.date}T00:00:00Z`) : null;
  if (day && !Number.isNaN(day.getTime())) {
    // a calendar day: shown in UTC so this Mac's time zone never moves it to the day before
    parts.push(day.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" }));
  }
  let country: string | undefined;
  try {
    country = h.country ? new Intl.DisplayNames(undefined, { type: "region" }).of(h.country) : undefined;
  } catch {
    country = h.country ?? undefined; // an unknown code: shown as it is
  }
  if (h.place) parts.push(country ? `${h.place}, ${country}` : h.place);
  else if (country) parts.push(country); // a camera without GPS, in a folder named after the country
  return parts.join(" · ");
}

export interface DefinitionHit {
  path: string;
  line: number;
  name: string;
  kind: string;
  signature: string;
  parent: string | null;
  chunk_id: number | null;
}
export interface AppHit {
  path: string;
  name: string;
  bundle_id: string | null;
}
export interface SettingHit {
  key: string;
  title: string;
  pane: string;
  url: string;
  is_pane: boolean;
}
export interface ShortcutHit {
  id: string;
  name: string;
}
export interface SearchReply {
  event_id: number | null;
  order: string[];
  results: FileHit[];
  photos: FileHit[];
  definitions: DefinitionHit[];
  apps: AppHit[];
  settings: SettingHit[];
  shortcuts: ShortcutHit[];
  music: MusicHit[];
  corrected_query: string | null;
}

export function search(query: string, category?: string): Promise<SearchReply> {
  return call<SearchReply>("search", { query, limit: 20, ...(category ? { category } : {}) });
}

/** The whole indexed passage of a result (the search reply has an excerpt): text from the index, not the file. */
export interface Passage {
  text: string;
  kind: string;
  page: number | null;
  start_line: number | null;
  end_line: number | null;
  start_ms: number | null;
}
export function passage(chunkId: number): Promise<Passage> {
  return call<Passage>("passage", { chunk_id: chunkId }, 5000);
}

/** Lines of an indexed text or code file around a result, read by the daemon (Raycast reads no files). */
export function lines(file: string, start: number, end: number | null, context: number): Promise<[number, string][]> {
  return call<{ lines: [number, string][] }>("preview", { path: file, start_line: start, end_line: end, context }, 5000).then(
    (r) => r.lines,
  );
}

/**
 * A small JPEG of an indexed photo or of a video's frame at the moment, made by the daemon (which has access to
 * your folders) into ~/Library/Caches/Lantern/thumbnails and deleted after 10 minutes: Raycast reads only that.
 */
export async function thumbnail(file: string, startMs: number | null, size = 480): Promise<string | null> {
  const r = await call<{ path: string | null }>("thumbnail", { path: file, start_ms: startMs, size }, 20000);
  return r.path;
}

/**
 * ⌘Y on a video or recording: the Lantern panel's own player in a small window (the whole file, started at the
 * moment, scrubbable back to the start; ⌘Y closes it), through the app's `lantern://preview` URL. Quick Look cannot
 * start at a moment. The app opens only indexed files.
 */
export async function previewAtMoment(file: string, startMs: number, text: string): Promise<void> {
  // encodeURIComponent, not URLSearchParams: its "+" for a space reaches Swift's URLComponents as a literal "+"
  const part = (k: string, v: string) => `${k}=${encodeURIComponent(v)}`;
  try {
    // whole characters (code points), so an emoji is never cut in half: encodeURIComponent throws on half of one
    const passage = Array.from(text).slice(0, 400).join("");
    const query = [part("path", file), part("ms", String(startMs)), part("text", passage)].join("&");
    await open(`lantern://preview?${query}`);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open the preview in Lantern",
      message: `Lantern 0.2.1 or newer previews recordings from the moment. ${err instanceof Error ? err.message : err}`,
    });
  }
}

/** Records the opened result, so Lantern learns your choices as it does from its own panel. */
export function opened(eventId: number | null, chunkId: number | null, key?: string): void {
  if (eventId == null || chunkId == null || chunkId < 0) return;
  call("opened", { event_id: eventId, chunk_id: chunkId, ...(key ? { key } : {}) }, 3000).catch(() => undefined);
}

export function shortPath(p: string): string {
  const home = os.homedir();
  return p.startsWith(home + "/") ? "~" + p.slice(home.length) : p;
}

export function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function run(file: string, args: string[], env?: Record<string, string>): Promise<boolean> {
  return new Promise((resolve) =>
    execFile(file, args, { env: { ...process.env, ...env } }, (err) => resolve(!err)),
  );
}

/** Like run, with the script's printed result (osascript prints what the script returns). */
function runOutput(file: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) =>
    execFile(file, args, (err, stdout) => resolve({ ok: !err, out: String(stdout ?? "").trim() })),
  );
}

/** The main executable of an app bundle (JetBrains IDEs take --line on it). */
function executable(app: string): Promise<string | undefined> {
  return new Promise((resolve) =>
    execFile(
      "/usr/bin/plutil",
      ["-extract", "CFBundleExecutable", "raw", "-o", "-", path.join(app, "Contents", "Info.plist")],
      (err, out) => {
        const file = err ? "" : path.join(app, "Contents", "MacOS", out.trim());
        resolve(file && existsSync(file) ? file : undefined);
      },
    ),
  );
}

const QUICKTIME = `on run argv
  set f to POSIX file (item 1 of argv)
  set t to (item 2 of argv) as integer
  tell application "QuickTime Player"
    activate
    set d to open f
    if d is missing value then set d to document 1
    set current time of d to t
    play d
  end tell
end run`;

const PDF_PREVIEW = `on run argv
  set f to POSIX file (item 1 of argv)
  set p to (item 2 of argv) as integer
  tell application "Preview"
    activate
    open f
  end tell
  -- Keystrokes go to whichever app is in front: send them only once Preview is in front with the document open.
  tell application "System Events"
    repeat 50 times
      if frontmost of process "Preview" and (count of windows of process "Preview") > 0 then exit repeat
      delay 0.1
    end repeat
    if not (frontmost of process "Preview" and (count of windows of process "Preview") > 0) then return "skipped"
    tell process "Preview"
      keystroke "g" using {option down, command down}
      delay 0.2
      if not frontmost then return "skipped"
      keystroke (p as text)
      key code 36
    end tell
  end tell
  return "jumped"
end run`;

const PDF_SKIM = `on run argv
  set f to POSIX file (item 1 of argv)
  set p to (item 2 of argv) as integer
  tell application "Skim"
    activate
    open f
    go document 1 to page p
  end tell
end run`;

const QUICKTIME_TYPES = new Set([".mp4", ".mov", ".m4v", ".m4a", ".mp3", ".wav", ".aiff", ".aif", ".caf", ".flac"]);

/**
 * Opens a file where the result is, in the app macOS would open it with (never a different one), as the Lantern
 * app does (app/Sources/LanternCore/Editors.swift): VS Code, Cursor, Xcode and JetBrains at the line; recordings in
 * QuickTime at the moment; PDFs at the page; anything else opens normally.
 */
export async function openAt(
  file: string,
  line: number | null,
  ms: number | null,
  page: number | null = null,
): Promise<void> {
  if (ms != null) {
    const ext = path.extname(file).toLowerCase();
    if (QUICKTIME_TYPES.has(ext)) {
      const args = ["-e", QUICKTIME, file, String(Math.floor(ms / 1000))];
      if (await run("/usr/bin/osascript", args)) return;
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened without going to ${clock(ms)}`,
        message: "Allow Raycast to control QuickTime Player in System Settings → Privacy & Security → Automation",
      });
    } else if (ms > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened at the start, not at ${clock(ms)}`,
        message: `QuickTime Player cannot open ${ext} files, so the moment cannot be set`,
      });
    }
  }
  if (page != null && path.extname(file).toLowerCase() === ".pdf") {
    const app = await getDefaultApplication(file).catch(() => undefined);
    const id = app?.bundleId ?? "";
    if (id === "net.sourceforge.skim-app.skim") {
      const args = ["-e", PDF_SKIM, file, String(page)];
      if (await run("/usr/bin/osascript", args)) return;
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened without going to page ${page}`,
        message: "Allow Raycast to control Skim in System Settings → Privacy & Security → Automation",
      });
    } else if (id === "com.apple.Preview") {
      const { ok, out } = await runOutput("/usr/bin/osascript", ["-e", PDF_PREVIEW, file, String(page)]);
      if (ok && out === "jumped") return;
      if (ok) {
        // Preview never came to the front with the document, so no keys were sent: the PDF is open, not at the page.
        await showToast({
          style: Toast.Style.Failure,
          title: `Opened without going to page ${page}`,
          message: "Preview was not in front in time; press ↩ again to retry",
        });
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not jump to PDF page",
        message: "Grant Raycast Accessibility permissions in System Settings to control Preview",
      });
    }
  }
  if (line != null) {
    const app = await getDefaultApplication(file).catch(() => undefined);
    const id = app?.bundleId ?? "";
    const encodedPath = file
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    const url = (scheme: string) => `${scheme}://file${encodedPath}:${line}`;
    if (id === "com.microsoft.VSCode") return open(url("vscode"));
    if (id === "com.microsoft.VSCodeInsiders") return open(url("vscode-insiders"));
    if (id === "com.vscodium") return open(url("vscodium"));
    if (id === "com.todesktop.230313mzl4w4u92") return open(url("cursor"));
    if (id === "com.apple.dt.Xcode" && app) {
      const developer = path.join(app.path, "Contents", "Developer");
      if (await run("/usr/bin/xed", ["-l", String(line), file], { DEVELOPER_DIR: developer })) return;
    }
    if ((id.startsWith("com.jetbrains.") || id === "com.google.android.studio") && app) {
      const launcher = await executable(app.path);
      if (launcher && (await run(launcher, ["--line", String(line), file]))) return;
    }
  }
  return open(file);
}

export function reveal(file: string): Promise<void> {
  return showInFinder(file);
}
