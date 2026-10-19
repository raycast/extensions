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
export async function thumbnail(file: string, startMs: number | null): Promise<string | null> {
  const r = await call<{ path: string | null }>("thumbnail", { path: file, start_ms: startMs, size: 480 }, 20000);
  return r.path;
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
    if (item 3 of argv) is "play" then play d
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

const QUICKTIME_TYPES = new Set([".mp4", ".mov", ".m4v", ".m4a", ".mp3", ".wav", ".aiff", ".aif", ".caf"]);

/**
 * Opens a file where the result is, in the app macOS would open it with (never a different one), as the Lantern
 * app does (app/Sources/LanternCore/Editors.swift): VS Code, Cursor, Xcode and JetBrains at the line; recordings in
 * QuickTime at the moment; PDFs at the page; anything else opens normally.
 */
export async function openAt(
  file: string,
  line: number | null,
  ms: number | null,
  play = true,
  page: number | null = null,
): Promise<void> {
  if (ms != null && QUICKTIME_TYPES.has(path.extname(file).toLowerCase())) {
    const args = ["-e", QUICKTIME, file, String(Math.floor(ms / 1000)), play ? "play" : "pause"];
    if (await run("/usr/bin/osascript", args)) return;
  }
  if (page != null && path.extname(file).toLowerCase() === ".pdf") {
    const app = await getDefaultApplication(file).catch(() => undefined);
    const id = app?.bundleId ?? "";
    if (id === "net.sourceforge.skim-app.skim") {
      const args = ["-e", PDF_SKIM, file, String(page)];
      if (await run("/usr/bin/osascript", args)) return;
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
