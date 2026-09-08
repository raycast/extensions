/**
 * Native desktop notifications, best-effort. Raycast has no notification API
 * of its own, so this is a port of flex-review's internal/notify: prefer
 * terminal-notifier (clickable — opens the PR — and coalesces repeats per
 * group) and fall back to osascript, which ships with macOS.
 *
 * Failures are swallowed: a missed banner should never disrupt a refresh.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PATH_ENV, findBinary } from "./binaries";

const run = promisify(execFile);

/** A single desktop banner. */
export type Notification = {
  title: string;
  subtitle?: string;
  /** Required by the OS notifiers; must be non-empty. */
  body: string;
  /** Coalesces repeats (terminal-notifier only). */
  group?: string;
  /** Opened on click (terminal-notifier only). */
  url?: string;
  /** A macOS sound name, e.g. "Ping". Omit for a silent banner. */
  sound?: string;
};

/** Reports whether banners can be delivered on this platform. */
export function notificationsAvailable(): boolean {
  return process.platform === "darwin";
}

/**
 * Reports whether terminal-notifier is installed. Without it, banners still
 * work through osascript but lose their click-through and grouping.
 */
export function hasTerminalNotifier(): boolean {
  return findBinary("terminal-notifier") !== undefined;
}

/** Builds the terminal-notifier argument list for a notification. */
function terminalNotifierArgs(n: Notification): string[] {
  const args = ["-message", n.body];
  if (n.title) args.push("-title", n.title);
  if (n.subtitle) args.push("-subtitle", n.subtitle);
  if (n.group) args.push("-group", n.group);
  if (n.url) args.push("-open", n.url);
  if (n.sound) args.push("-sound", n.sound);
  return args;
}

/** Wraps a string in an AppleScript literal, escaping backslashes and quotes. */
function quoteAppleScript(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Builds the AppleScript `display notification` program. It has no click
 * action, so the URL is dropped.
 */
function osascriptProgram(n: Notification): string {
  let program = `display notification ${quoteAppleScript(n.body)}`;
  if (n.title) program += ` with title ${quoteAppleScript(n.title)}`;
  if (n.subtitle) program += ` subtitle ${quoteAppleScript(n.subtitle)}`;
  if (n.sound) program += ` sound name ${quoteAppleScript(n.sound)}`;
  return program;
}

/** Delivers one banner. Never throws; returns false when nothing was shown. */
export async function send(n: Notification): Promise<boolean> {
  if (!notificationsAvailable()) return false;
  // The notifiers reject an empty message.
  const notification = { ...n, body: n.body || n.title };

  const options = { env: { ...process.env, PATH: PATH_ENV }, timeout: 10_000 };
  try {
    const terminalNotifier = findBinary("terminal-notifier");
    if (terminalNotifier) {
      await run(terminalNotifier, terminalNotifierArgs(notification), options);
      return true;
    }
    await run("/usr/bin/osascript", ["-e", osascriptProgram(notification)], options);
    return true;
  } catch {
    return false;
  }
}
