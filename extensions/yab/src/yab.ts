// Talking to the running Yab: AppleScript for live windows, spaces and tabs
// (Resources/Yab.sdef), and Yab's own binary for the agent and MCP tools.
// Yab's socket only answers its own binary, so Raycast runs that binary.
// docs/raycast.md, "How it reaches Yab".

import { Clipboard, getApplications, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";
import { bundleID, resolve, spaceInfos } from "./data";

const exec = promisify(execFile);

export type Location = "topApp" | "pinned" | "unpinned";

export type Tab = {
  id: string;
  title: string;
  url: string;
  location: Location;
  spaceId: string;
  spaceTitle: string;
  spaceIcon: string;
  active: boolean;
};

export type Space = {
  id: string;
  title: string;
  icon: string;
  color?: string;
  active: boolean;
  pins: number;
  kept: number;
  today: number;
};

export type Window = { tabs: Tab[]; spaces: Space[] };

/** An AppleScript string literal. */
export function lit(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function tellYab(body: string): string {
  return `tell application id ${lit(bundleID())}\n${body}\nend tell`;
}

export async function isRunning(): Promise<boolean> {
  // `is running` asks without launching, as a `tell` would.
  return (await runAppleScript(`return application id ${lit(bundleID())} is running`)) === "true";
}

/** Yab running with a window, opened if it isn't. */
export async function ensureWindow(): Promise<void> {
  await runAppleScript(`
    set yab to ${lit(bundleID())}
    if application id yab is not running then
      tell application id yab to activate
      repeat 50 times
        delay 0.1
        try
          if (count of windows of application id yab) > 0 then exit repeat
        end try
      end repeat
    else
      tell application id yab
        if (count of windows) is 0 then make new window
      end tell
    end if
  `);
}

// MARK: - reading

/** Fields and rows of readWindow's answer: ASCII's unit and record separators, never in a title. */
const US = "\u001f";
const RS = "\u001e";

/**
 * Every tab of the front window, every space, and the spaces, in one
 * round trip. `launch: false` answers null rather than open Yab, for the
 * menu bar's refreshes. Space colors come from spaces.json, so the script
 * compiles against a Yab of any age.
 */
export async function readWindow({ launch = true }: { launch?: boolean } = {}): Promise<Window | null> {
  if (!launch && !(await isRunning())) return null;
  if (launch) await ensureWindow();
  const out = await runAppleScript(
    `
    set US to (ASCII character 31)
    set RS to (ASCII character 30)
    tell application id ${lit(bundleID())}
      if (count of windows) is 0 then return ""
      tell front window
        set onScreen to ""
        try
          set onScreen to id of active space
        end try
        set inFront to ""
        try
          set inFront to id of active tab
        end try
        set out to "W" & US & onScreen & US & inFront
        repeat with s in spaces
          set sid to id of s
          set out to out & RS & "S" & US & sid & US & (title of s) & US & (icon of s)
          set ids to id of every tab of s
          set titles to title of every tab of s
          set urls to URL of every tab of s
          set places to location of every tab of s
          repeat with i from 1 to count of ids
            set out to out & RS & "T" & US & (item i of ids) & US & (item i of titles) & US & (item i of urls) & US & (item i of places) & US & sid
          end repeat
        end repeat
        return out
      end tell
    end tell`,
    { timeout: 15000 },
  );
  const window = parseWindow(out);
  // Within a space: pins, kept tabs, then today's, as the sidebar shows them.
  if (window) {
    const rank = { topApp: 0, pinned: 1, unpinned: 2 } as const;
    const order = new Map(window.spaces.map((s, i) => [s.id, i]));
    window.tabs = window.tabs
      .map((tab, index) => ({ tab, index }))
      .sort(
        (a, b) =>
          (order.get(a.tab.spaceId) ?? 0) - (order.get(b.tab.spaceId) ?? 0) ||
          rank[a.tab.location] - rank[b.tab.location] ||
          a.index - b.index,
      )
      .map((x) => x.tab);
  }
  return window;
}

export function parseWindow(out: string): Window | null {
  if (!out.startsWith("W")) return null;
  const rows = out.split(RS).map((r) => r.split(US));
  const [, onScreen, inFront] = rows[0];
  const colors = new Map(spaceInfos().map((s) => [s.id, s.color]));
  const spaces: Space[] = [];
  const tabs: Tab[] = [];
  for (const row of rows.slice(1)) {
    if (row[0] === "S") {
      const [, id, title, icon] = row;
      spaces.push({ id, title, icon, color: colors.get(id), active: id === onScreen, pins: 0, kept: 0, today: 0 });
    } else if (row[0] === "T") {
      const [, id, title, url, place, spaceId] = row;
      const space = spaces.find((s) => s.id === spaceId);
      const location = (["topApp", "pinned"].includes(place) ? place : "unpinned") as Location;
      if (space) space[location === "topApp" ? "pins" : location === "pinned" ? "kept" : "today"]++;
      tabs.push({
        id,
        title,
        url,
        location,
        spaceId,
        spaceTitle: space?.title ?? "",
        spaceIcon: space?.icon ?? "",
        active: id === inFront,
      });
    }
  }
  return { spaces, tabs };
}

export async function focusedTab(): Promise<Tab | undefined> {
  const window = await readWindow();
  return window?.tabs.find((t) => t.active);
}

// MARK: - acting on tabs and spaces

async function onTab(id: string, verb: string, activate = false) {
  await runAppleScript(
    tellYab(`tell front window to ${verb} (first tab whose id is ${lit(id)})${activate ? "\nactivate" : ""}`),
  );
}

export const selectTab = (id: string) => onTab(id, "select", true);
export const closeTab = (id: string) => onTab(id, "close");
export const reloadTab = (id: string) => onTab(id, "reload");

export async function focusSpace(id: string) {
  await ensureWindow();
  await runAppleScript(tellYab(`tell front window to focus (first space whose id is ${lit(id)})\nactivate`));
}

/** A tab already open on this address, so ↵ goes there instead of opening another. */
export function openTabFor(tabs: Tab[] | undefined, url: string): Tab | undefined {
  const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");
  return tabs?.find((t) => norm(t.url) === norm(url));
}

// MARK: - opening

/** A new tab at an address or a search, in a space when given. */
export async function newTab(text: string, spaceId?: string) {
  await ensureWindow();
  const url = text.trim() ? await resolve(text, spaceId) : undefined;
  const props = url ? ` with properties {URL:${lit(url)}}` : "";
  if (spaceId) {
    try {
      await runAppleScript(
        tellYab(`tell (first space of front window whose id is ${lit(spaceId)}) to make new tab${props}\nactivate`),
      );
      return;
    } catch {
      // A Yab before spaces took new tabs: go there, then make it.
      await runAppleScript(tellYab(`tell front window to focus (first space whose id is ${lit(spaceId)})`));
    }
  }
  await runAppleScript(tellYab(`tell front window to make new tab${props}\nactivate`));
}

export async function newWindow({ url, spaceId }: { url?: string; spaceId?: string } = {}) {
  const running = await isRunning();
  // Launching opens a window of its own: making another would leave two.
  if (!running) await ensureWindow();
  else await runAppleScript(tellYab(`make new window`));
  if (spaceId) await runAppleScript(tellYab(`tell front window to focus (first space whose id is ${lit(spaceId)})`));
  if (url) await runAppleScript(tellYab(`tell front window to make new tab with properties {URL:${lit(url)}}`));
  await runAppleScript(tellYab(`activate`));
}

export async function newPrivateWindow(url?: string) {
  if (!(await isRunning())) await ensureWindow();
  try {
    await runAppleScript(tellYab(`make new window with properties {incognito:true}\nactivate`));
  } catch {
    // A Yab without the word: its menu's ⇧⌘N.
    await runAppleScript(tellYab(`activate`));
    await runAppleScript(`tell application "System Events" to keystroke "n" using {command down, shift down}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  if (url) {
    await runAppleScript(tellYab(`tell front window to make new tab with properties {URL:${lit(url)}}`)).catch(
      async () => open(url, bundleID()),
    );
  }
}

/** Yab's Small Window, its Little Arc. */
export async function openSmallWindow(url?: string) {
  try {
    await runAppleScript(tellYab(url ? `open small window ${lit(url)}` : `open small window`));
  } catch {
    // Before the word: an outside link opens there while Settings › Links says so.
    if (url) await open(url, bundleID());
    else await runAppleScript(tellYab(`activate`));
  }
}

export async function openURL(url: string, where: "tab" | "small" = "tab") {
  if (where === "small") return openSmallWindow(url);
  await ensureWindow();
  await runAppleScript(tellYab(`tell front window to make new tab with properties {URL:${lit(url)}}\nactivate`));
}

/** ⌘J in Yab with the words in it. */
export async function askInYab(prompt: string, send: boolean) {
  await ensureWindow();
  try {
    await runAppleScript(tellYab(`ask ${lit(prompt)} send ${send}\nactivate`));
  } catch {
    // Before the word: through the keyboard, as a person would.
    await Clipboard.copy(prompt);
    await runAppleScript(tellYab(`activate`));
    await runAppleScript(`
      tell application "System Events"
        keystroke "j" using {command down}
        delay 0.35
        keystroke "v" using {command down}
        ${send ? "delay 0.1\nkey code 36" : ""}
      end tell`);
  }
}

/** A thread in Yab's mail, from the "account|thread" id mail_search prints. */
export async function showMail(id: string) {
  try {
    await runAppleScript(tellYab(`show mail ${lit(id)}\nactivate`));
  } catch {
    const [account, thread] = id.split("|");
    await open(`https://mail.google.com/mail/u/${encodeURIComponent(account)}/#all/${thread}`, bundleID());
  }
}

// MARK: - the yab binary

let binaryPath: string | undefined;

export async function yabBinary(): Promise<string> {
  if (binaryPath) return binaryPath;
  const app = (await getApplications()).find((a) => a.bundleId === bundleID());
  const candidates = [
    app ? join(app.path, "Contents", "MacOS", "yab") : "",
    "/Applications/yab.app/Contents/MacOS/yab",
    "/Applications/Yab.app/Contents/MacOS/yab",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Yab isn't installed. Get it at yetanotherbrowser.com");
  binaryPath = found;
  return found;
}

function env(): NodeJS.ProcessEnv {
  return { ...process.env, YAB_CLI: "1", YAB_CALLER: "raycast" };
}

/** `yab WORDS…`, its output once it ends. */
export async function cli(args: string[], timeout = 20000): Promise<{ stdout: string; code: number }> {
  const bin = await yabBinary();
  try {
    const { stdout } = await exec(bin, args, { env: env(), timeout, maxBuffer: 16 * 1024 * 1024 });
    return { stdout, code: 0 };
  } catch (error) {
    const e = error as { stdout?: string; code?: number };
    return { stdout: e.stdout ?? "", code: typeof e.code === "number" ? e.code : 1 };
  }
}

/**
 * One MCP tool of Yab's, called once: initialize, the call, then the
 * process is let go. Answers the tool's text.
 */
export async function callTool(name: string, args: Record<string, unknown>, timeout = 30000): Promise<string> {
  const bin = await yabBinary();
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, ["mcp"], { env: env() });
    let buffer = "";
    let done = false;
    const finish = (error?: Error, text?: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.stdin.end();
      child.kill();
      if (error) reject(error);
      else resolvePromise(text ?? "");
    };
    const timer = setTimeout(() => finish(new Error("Yab took too long to answer")), timeout);
    child.on("error", (e) => finish(e));
    child.on("exit", () => finish(new Error("Yab stopped before answering")));
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      let at: number;
      while ((at = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, at).trim();
        buffer = buffer.slice(at + 1);
        if (!line.startsWith("{")) continue;
        try {
          const message = JSON.parse(line) as {
            id?: number;
            result?: { isError?: boolean; content?: { type: string; text?: string }[] };
            error?: { message: string };
          };
          if (message.id !== 2) continue;
          if (message.error) return finish(new Error(message.error.message));
          const text = (message.result?.content ?? []).map((c) => c.text ?? "").join("\n");
          if (message.result?.isError) return finish(new Error(text || "Yab couldn't do that"));
          return finish(undefined, text);
        } catch {
          // Not a whole message yet.
        }
      }
    });
    const send = (m: unknown) => child.stdin.write(JSON.stringify(m) + "\n");
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Raycast", version: "1.0" } },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } });
  });
}

export async function activateYab() {
  await ensureWindow();
  await runAppleScript(tellYab("activate"));
}
