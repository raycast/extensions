// Opening a result where it matched: code in the chosen editor at the line, a PDF with words from its page in the PDF
// app's search, a recording at its moment in QuickTime Player or IINA, anything else in its default app.
// DigUp: Moments.swift (Engine.open, Opener) and CodeEditors.swift.

import {
  closeMainWindow,
  getApplications,
  getDefaultApplication,
  getPreferenceValues,
  open,
  showHUD,
  type Application,
} from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { api } from "../lib/client";
import { chooseEditor, launchPlan, type CodeEditor } from "../lib/editors";
import { extensionOf } from "../lib/format";
import { searchWords, type ResultRow } from "../lib/results";

export const QUICKTIME = "com.apple.QuickTimePlayerX";
export const IINA = "com.colliderli.iina";

function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export interface ResolvedEditor {
  editor: CodeEditor;
  app: Application;
}

let editorLookup: Promise<ResolvedEditor | null> | null = null;

/** The editor code opens in (the `codeEditor` preference, else the first installed one), or null: default app. */
export function resolveEditor(): Promise<ResolvedEditor | null> {
  editorLookup ??= (async () => {
    const preference = preferences().codeEditor;
    if (preference === "default") return null;
    const apps = await getApplications();
    const byId = new Map(apps.filter((app) => app.bundleId).map((app) => [app.bundleId as string, app]));
    const editor = chooseEditor(preference, new Set(byId.keys()));
    return editor ? { editor, app: byId.get(editor.id) as Application } : null;
  })().catch(() => null);
  return editorLookup;
}

const defaultApps = new Map<string, Promise<string | null>>();

/** The bundle id of the app a file opens in by default, per extension (what DigUp's Opener asks NSWorkspace). */
export function defaultAppId(path: string): Promise<string | null> {
  const key = extensionOf(path);
  let found = defaultApps.get(key);
  if (!found) {
    found = getDefaultApplication(path).then(
      (app) => app.bundleId ?? null,
      () => null,
    );
    defaultApps.set(key, found);
  }
  return found;
}

/**
 * The player a recording opens in when it can be told a moment: the `mediaPlayer` preference, or with "default" the
 * file's default app when that is QuickTime Player or IINA (DigUp's `jumpsToMoments`). Null: open it plainly.
 */
export async function momentPlayer(path: string): Promise<string | null> {
  const chosen = chosenPlayer();
  if (chosen) return chosen;
  const app = await defaultAppId(path);
  return app === QUICKTIME || app === IINA ? app : null;
}

function bundleExecutable(appPath: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/plutil",
      ["-extract", "CFBundleExecutable", "raw", "-o", "-", `${appPath}/Contents/Info.plist`],
      { timeout: 3000 },
      (error, stdout) => resolve(error ? undefined : stdout.trim() || undefined),
    );
  });
}

/** Runs an editor's own launcher; if it's missing or fails to start, the file opens plainly in that editor. */
function launch(file: string, args: string[], fallback: () => Promise<void>): Promise<void> {
  if (!existsSync(file)) return fallback();
  return new Promise((resolve) => {
    const child = spawn(file, args, { detached: true, stdio: "ignore" });
    child.once("error", () => fallback().then(resolve, resolve));
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

/** Opens `path` at `line` in `resolved`'s editor, or in the file's default app when there is none. */
export async function openCode(path: string, line: number, resolved: ResolvedEditor | null): Promise<void> {
  if (!resolved) return open(path);
  const { editor, app } = resolved;
  const executable = editor.method.kind === "jetBrains" ? await bundleExecutable(app.path) : undefined;
  const plan = launchPlan(editor, app.path, path, line, executable);
  const plain = () => open(path, app);
  switch (plan.type) {
    case "url":
      return open(plan.url).catch(plain);
    case "exec":
      return launch(plan.file, plan.args, plain);
    case "plain":
      return plain();
  }
}

/**
 * Opens a result in its app, at the line, page or moment that matched, and closes Raycast's window. A request to the
 * daemon is sent before the window closes, so a command unloaded on close can't cut it off.
 */
export async function openRow(row: ResultRow): Promise<void> {
  if (row.kind === "code") {
    const resolved = await resolveEditor();
    await openCode(row.path, row.codeLine, resolved);
    await closeMainWindow();
    return;
  }
  if (row.page !== null && row.page > 1) {
    const opening = api("POST /open-pdf", { path: row.path, page: row.page, words: searchWords(row) });
    await closeMainWindow();
    await opening.catch(() => open(row.path));
    return;
  }
  const chosen = row.kind === "audio" || row.kind === "video" ? chosenPlayer() : null;
  if (row.moment !== null && row.moment >= 1) {
    const player = await momentPlayer(row.path);
    if (player) {
      const opening = api("POST /open-media", { path: row.path, seconds: row.moment, player });
      await closeMainWindow();
      const opened = await opening.catch(async () => {
        await open(row.path, player);
        return null;
      });
      if (opened?.how === "plain" && player === QUICKTIME) {
        await showHUD("Opened from the start: allow Raycast to control QuickTime Player in Privacy & Security");
      }
      return;
    }
  }
  await open(row.path, chosen ?? undefined);
  await closeMainWindow();
}

/** The player the `mediaPlayer` preference names, or null for the file's default app. */
function chosenPlayer(): string | null {
  const preference = preferences().mediaPlayer;
  return preference && preference !== "default" ? preference : null;
}
