import { Toast, closeMainWindow, open, showToast } from "@raycast/api";
import * as fs from "fs";
import * as os from "os";
import path from "path";
import { build } from "./lib/preferences";
import { VSCodeBuild } from "./lib/types";
import { isMac } from "./lib/utils";
import { getEditorApplication } from "./utils/editor";
import { getVSCodeCLI } from "./lib/vscode";

function windowsProgramFile(...segments: string[]): string {
  return path.join(os.homedir(), "AppData", "Local", "Programs", ...segments);
}

function macAppPath(appName: string): string {
  const candidates = [path.join("/Applications", appName), path.join(os.homedir(), "Applications", appName)];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

async function openPathOrThrow(target: string, label: string) {
  if (!fs.existsSync(target)) {
    throw new Error(`${label} not found at ${target}. Is it installed?`);
  }
  await open(target);
}

/**
 * The Agents Window for Antigravity IDE is a separate app (Antigravity 2.0),
 * launched directly by absolute path.
 */
async function openAntigravityAgentsWindow() {
  if (isMac) {
    await openPathOrThrow(macAppPath("Antigravity.app"), "Antigravity app");
  } else {
    await openPathOrThrow(windowsProgramFile("antigravity", "Antigravity.exe"), "Antigravity app");
  }
}

/**
 * Cursor has no agents-window equivalent, so just launch it regularly by
 * absolute path — it is missing from Raycast's Windows app list, so
 * name-based resolution (like "Open New Window" uses) silently misses it.
 */
async function openCursorWindow() {
  if (isMac) {
    await openPathOrThrow(macAppPath("Cursor.app"), "Cursor app");
  } else {
    await openPathOrThrow(windowsProgramFile("cursor", "Cursor.exe"), "Cursor app");
  }
}

/**
 * Fallback for the remaining builds: just launch the editor regularly, same
 * as "Open New Window" does on Windows.
 */
async function openRegularly() {
  const editorApp = await getEditorApplication(build);
  if (!editorApp) {
    throw new Error(`${build} app not found. Is it installed?`);
  }
  await open("", editorApp);
}

export default async function command() {
  try {
    await closeMainWindow();
    if (build === VSCodeBuild.AntigravityIDE) {
      await openAntigravityAgentsWindow();
    } else if (build === VSCodeBuild.Code || build === VSCodeBuild.CodeInsiders) {
      getVSCodeCLI().openAgentsWindowSync();
    } else if (build === VSCodeBuild.Cursor) {
      await openCursorWindow();
    } else {
      await openRegularly();
    }
  } catch (error) {
    await showToast({
      title: "Failed opening agents window",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
