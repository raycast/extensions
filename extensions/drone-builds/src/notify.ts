import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const execFileP = promisify(execFile);

const TN_CANDIDATES = [
  "/opt/homebrew/bin/terminal-notifier",
  "/usr/local/bin/terminal-notifier",
  "/opt/local/bin/terminal-notifier",
];

let cachedTNPath: string | null | undefined;

function findTerminalNotifier(): string | null {
  if (cachedTNPath !== undefined) return cachedTNPath;
  for (const p of TN_CANDIDATES) {
    if (existsSync(p)) {
      cachedTNPath = p;
      return p;
    }
  }
  cachedTNPath = null;
  return null;
}

export interface NotifyArgs {
  title: string;
  subtitle?: string;
  message: string;
  openUrl?: string;
  /** Stable key (e.g. `drone-${buildId}`) so repeats collapse instead of stacking. */
  groupKey?: string;
  sound?: "Glass" | "Basso" | "Funk" | "Ping" | "Pop" | "Hero" | "Submarine";
}

async function notifyViaTerminalNotifier(
  tn: string,
  args: NotifyArgs,
): Promise<void> {
  const flags: string[] = [
    "-title",
    args.title,
    "-message",
    args.message,
    "-sender",
    "com.raycast.macos",
  ];
  if (args.subtitle) flags.push("-subtitle", args.subtitle);
  if (args.openUrl) flags.push("-open", args.openUrl);
  if (args.groupKey) flags.push("-group", args.groupKey);
  if (args.sound) flags.push("-sound", args.sound);
  await execFileP(tn, flags, { timeout: 5000 });
}

async function notifyViaOsascript(args: NotifyArgs): Promise<void> {
  // AppleScript string literals can't span multiple lines, so collapse any
  // newlines/CRs to spaces before escaping quotes/backslashes — otherwise a
  // single \n in a Drone field would produce a syntax error and silently drop
  // the notification.
  const esc = (s: string) =>
    s.replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const parts: string[] = [`display notification "${esc(args.message)}"`];
  parts.push(`with title "${esc(args.title)}"`);
  if (args.subtitle) parts.push(`subtitle "${esc(args.subtitle)}"`);
  if (args.sound) parts.push(`sound name "${esc(args.sound)}"`);
  await runAppleScript(parts.join(" "));
}

/**
 * Fires a native macOS Notification Center banner. Prefers terminal-notifier
 * (clickable, custom sender icon, group de-dupe) when the preference is on and
 * the binary is found; otherwise falls back to osascript (works out of the box,
 * but shows as "Script Editor" with no click handler).
 */
export async function notify(
  args: NotifyArgs,
  opts: { preferTerminalNotifier: boolean },
): Promise<void> {
  if (opts.preferTerminalNotifier) {
    const tn = findTerminalNotifier();
    if (tn) {
      try {
        await notifyViaTerminalNotifier(tn, args);
        return;
      } catch {
        // fall through to osascript
      }
    }
  }
  try {
    await notifyViaOsascript(args);
  } catch (err) {
    await showFailureToast(err as Error, { title: "Notification failed" });
  }
}
