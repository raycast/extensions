import { Clipboard, getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { promisify } from "util";
import { newId } from "./ids";
import { filePath, readJson, writeJson } from "./storage";
import type { HistoryItem, Preferences } from "./types";
import { ensureCurrent, ensureHelper, isHelperEnabled } from "./watcher";

const exec = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Response = { id: string; action: "paste" | "none" | "pong" };

/**
 * Sends ⌘V. The osascript process is a child of Raycast, so it uses Raycast's
 * Accessibility permission (the same one Raycast needs for its own paste action).
 */
const CMD_V = `ObjC.import("CoreGraphics");
var src = $.CGEventSourceCreate(0);
var d = $.CGEventCreateKeyboardEvent(src, 9, true);
var u = $.CGEventCreateKeyboardEvent(src, 9, false);
$.CGEventSetFlags(d, 0x100000);
$.CGEventSetFlags(u, 0x100000);
$.CGEventPost(0, d);
$.CGEventPost(0, u);`;

async function pressCmdV() {
  if (getPreferenceValues<Preferences>().pasteAfterSelect ?? true) {
    await exec("/usr/bin/osascript", ["-l", "JavaScript", "-e", CMD_V]);
  }
}

/** Send a request to helper.js and wait for its response. */
async function request(body: Record<string, unknown>, timeoutMs: number): Promise<Response | null> {
  const id = newId();
  const reqPath = filePath("request.json");
  const resPath = filePath("response.json");
  if (existsSync(resPath)) unlinkSync(resPath);
  writeJson("request.json", { ...body, id });

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await sleep(15);
    if (Date.now() - started > 800 && existsSync(reqPath)) {
      // Not picked up within 0.8 s: the helper is not running.
      unlinkSync(reqPath);
      return null;
    }
    const res = readJson<Response | null>("response.json", null);
    if (res && res.id === id) {
      unlinkSync(resPath);
      return res;
    }
  }
  return null;
}

async function requestWithRetry(body: Record<string, unknown>, timeoutMs: number) {
  let res = await request(body, timeoutMs);
  if (!res) {
    // Restart the helper and try once more. Keep the wait short so Raycast does not unload the command.
    await ensureHelper().catch(() => undefined);
    const deadline = Date.now() + 3000;
    let alive = false;
    while (!alive && Date.now() < deadline) {
      await sleep(150);
      alive = !!(await request({ cmd: "ping" }, 800));
    }
    if (!alive) return null;
    res = await request(body, timeoutMs);
  }
  return res;
}

export type PopupKind = "main" | "history" | "snippets";

/** Show the menu at the mouse cursor and paste the selection. */
export async function popup(kind: PopupKind) {
  if (!isHelperEnabled()) {
    // First run: one screen, one Enter.
    await launchCommand({ name: "clipboard-helper", type: LaunchType.UserInitiated });
    return;
  }
  await ensureCurrent().catch(() => undefined);
  const res = await requestWithRetry({ cmd: "popup", menu: kind }, 60 * 1000);
  if (!res) {
    await showHUD("Clipboard helper is not responding");
    await launchCommand({ name: "clipboard-helper", type: LaunchType.UserInitiated });
    return;
  }
  if (res.action === "paste") await pressCmdV();
}

/** Paste a history item from the menu bar. The helper restores every pasteboard type, then ⌘V is sent. */
export async function pasteHistoryItem(item: HistoryItem) {
  const res = isHelperEnabled() ? await request({ cmd: "paste", historyId: item.id }, 3000) : null;
  if (res?.action === "paste") {
    await sleep(30);
    await pressCmdV();
    return;
  }
  // Fallback without the helper (text, HTML, or a single file).
  writeJson("selfpaste.json", { id: item.id, at: Date.now() });
  if (item.kind === "image" && item.imagePath) await Clipboard.paste({ file: item.imagePath });
  else if (item.kind === "file" && item.files?.length === 1) await Clipboard.paste({ file: item.files[0] });
  else await Clipboard.paste(item.html ? { text: item.text, html: item.html } : { text: item.text });
}
