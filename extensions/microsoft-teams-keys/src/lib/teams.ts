import { Clipboard, getFrontmostApplication, getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** The new Teams client. The classic one (com.microsoft.teams) is retired. */
export const TEAMS_BUNDLE_ID = "com.microsoft.teams2";

export class TeamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamsError";
  }
}

/** A key on the keyboard, as System Events understands it. */
export type Key = { char: string } | { code: number };
export type Modifier = "command" | "shift" | "option" | "control";

export const RETURN: Key = { code: 36 };
export const ESCAPE: Key = { code: 53 };

const TIMING_FACTOR: Record<string, number> = {
  instant: 0.1,
  ultraFast: 0.2,
  veryFast: 0.35,
  fast: 0.6,
  normal: 1,
  slow: 1.8,
  verySlow: 3,
};

/**
 * Two separate speeds: meeting shortcuts are one keystroke Teams answers at
 * once, while chats, messages and status go through the Teams search, which
 * first has to find something.
 */
export type TimingKind = "shortcuts" | "search";

/**
 * How much the waits of one kind are stretched or shortened: the preset, or the
 * custom factor when the preset is Custom Factor. Out-of-range input falls back to 1.
 */
export function timingFactor(kind: TimingKind): number {
  const prefs = getPreferenceValues<Preferences>();
  const [preset, custom] =
    kind === "shortcuts"
      ? [prefs.shortcutTiming, prefs.customShortcutTiming]
      : [prefs.searchTiming, prefs.customSearchTiming];
  if (preset === "custom") {
    const value = Number.parseFloat((custom ?? "").replace(",", "."));
    return Number.isFinite(value) && value >= 0.05 && value <= 10 ? value : 1;
  }
  return TIMING_FACTOR[preset] ?? 1;
}

/** Waits `ms` milliseconds, stretched by the timing preference of that kind. */
export function pause(ms: number, kind: TimingKind = "search"): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.round(ms * timingFactor(kind))));
}

/** AppleScript string literal. Only ever used for values the extension controls. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function isTeamsInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == "${TEAMS_BUNDLE_ID}"`]);
    if (stdout.trim()) return true;
  } catch {
    // Spotlight can be off; fall through to the usual location.
  }
  try {
    await execFileAsync("/bin/test", ["-d", "/Applications/Microsoft Teams.app"]);
    return true;
  } catch {
    return false;
  }
}

export async function isTeamsRunning(): Promise<boolean> {
  const result = await runAppleScript(
    `tell application "System Events" to return (exists (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)}))`,
  );
  return result.trim() === "true";
}

/**
 * Brings Teams to the front, starting it if needed, and waits until it is the
 * frontmost app. Keystrokes sent before that would land in another app.
 */
export async function activateTeams(kind: TimingKind = "search"): Promise<void> {
  // Already in front: leave the window as it is. Activating again can pull
  // the main window over the meeting window the user is working in.
  const before = await getFrontmostApplication().catch(() => undefined);
  if (before?.bundleId === TEAMS_BUNDLE_ID) {
    await focusFrontWindow();
    await pause(120, kind);
    await waitForModifierRelease();
    return;
  }
  const running = await isTeamsRunning();
  if (!running && !(await isTeamsInstalled())) {
    throw new TeamsError(
      "Microsoft Teams is not installed. Microsoft Teams Keys works with the new Teams desktop app.",
    );
  }
  await runAppleScript(`tell application id ${quote(TEAMS_BUNDLE_ID)} to activate`);
  // A cold start takes a few seconds before Teams accepts input.
  const deadline = Date.now() + (running ? 3000 : 20000);
  const poll = Math.max(30, Math.round(150 * Math.min(timingFactor(kind), 1)));
  while (Date.now() < deadline) {
    const front = await getFrontmostApplication().catch(() => undefined);
    if (front?.bundleId === TEAMS_BUNDLE_ID) {
      // After a cold start Teams needs its time however fast the Timing is.
      if (running) await pause(250, kind);
      else await new Promise((resolve) => setTimeout(resolve, Math.max(2500, 4000 * timingFactor(kind))));
      await waitForModifierRelease();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, poll));
  }
  throw new TeamsError("Teams did not come to the front. Open it once by hand, then try again.");
}

/**
 * Makes the frontmost Teams window the key window again. After the Raycast
 * window closes, Teams can be the active app with no window focused, and a
 * shortcut then only produces the macOS error sound. Raising the window that
 * is already on top keeps the meeting window where it is.
 */
async function focusFrontWindow(): Promise<void> {
  await runAppleScript(
    `tell application "System Events"
  tell (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)})
    set frontmost to true
    if (count of windows) > 0 then perform action "AXRaise" of window 1
  end tell
end tell`,
  ).catch(() => undefined);
}

/**
 * Waits (up to 1.5 s) until no modifier key is held. A Raycast hotkey such as
 * ⌥⌘M is often still pressed when the command runs; a shortcut sent then
 * arrives as ⌥⌘⇧M instead of ⌘⇧M and Teams ignores it.
 */
async function waitForModifierRelease(): Promise<void> {
  await runAppleScript(
    `ObjC.import("AppKit");
const mask = (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20);
const end = Date.now() + 1500;
while (Date.now() < end && ($.NSEvent.modifierFlags & mask) !== 0) delay(0.02);`,
    { language: "JavaScript" },
  ).catch(() => undefined);
}

/**
 * Presses a key in Teams. The keystroke goes to the Teams process, so nothing
 * lands in another app if the focus changed in between.
 */
export async function press(key: Key, modifiers: Modifier[] = []): Promise<void> {
  const using = modifiers.length > 0 ? ` using {${modifiers.map((m) => `${m} down`).join(", ")}}` : "";
  const stroke = "char" in key ? `keystroke ${quote(key.char)}${using}` : `key code ${key.code}${using}`;
  await runAppleScript(
    `tell application "System Events"
  tell (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)})
    if frontmost is false then error "Teams is not in front."
    ${stroke}
  end tell
end tell`,
  );
}

/**
 * Types any text, umlauts and emoji included, by pasting it. The clipboard is
 * restored afterwards, so the user's own clipboard survives.
 */
export async function typeText(text: string): Promise<void> {
  const previous = await Clipboard.read().catch(() => undefined);
  await Clipboard.copy(text, { concealed: true });
  try {
    await press({ char: "v" }, ["command"]);
    await pause(250);
  } finally {
    // Also when the paste failed, so the temporary text never stays behind.
    if (previous?.file) await Clipboard.copy({ file: previous.file }, { concealed: true });
    else if (previous?.html) await Clipboard.copy({ html: previous.html, text: previous.text }, { concealed: true });
    else if (previous?.text) await Clipboard.copy(previous.text, { concealed: true });
    else await Clipboard.clear();
  }
}

/** Remembers the app in front, so it can come back after a quick trip to Teams. */
export async function rememberFrontApp(): Promise<string | undefined> {
  const front = await getFrontmostApplication().catch(() => undefined);
  if (!front || front.bundleId === TEAMS_BUNDLE_ID || front.bundleId?.startsWith("com.raycast.")) return undefined;
  return front.bundleId;
}

export async function returnTo(bundleId: string | undefined): Promise<void> {
  if (!bundleId) return;
  await runAppleScript(`tell application id ${quote(bundleId)} to activate`).catch(() => undefined);
}

/**
 * The views of the Teams main window, in English and German. The main window
 * is titled after the view that is open ("Chat | … | Microsoft Teams"); any
 * other large Teams window is a meeting or call.
 */
const MAIN_VIEWS = new Set(
  [
    "activity",
    "chat",
    "teams",
    "calendar",
    "calls",
    "files",
    "onedrive",
    "apps",
    "communities",
    "copilot",
    "assignments",
    "people",
    "aktivität",
    "kalender",
    "anrufe",
    "dateien",
    "communitys",
    "personen",
    "aufgaben",
  ].map((v) => v.normalize("NFC")),
);

/**
 * Brings the window of the running call or meeting to the front, also when it
 * is minimised or behind other windows. Returns its title.
 */
export async function bringCallToFront(): Promise<string> {
  if (!(await isTeamsRunning())) throw new TeamsError("Teams is not running, so there is no call.");
  const raw = await runAppleScript(
    `set rs to (ASCII character 30)
set us to (ASCII character 31)
set out to ""
tell application "System Events"
  tell (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)})
    repeat with i from 1 to (count of windows)
      set w to window i
      set t to ""
      try
        set t to name of w
      end try
      set out to out & i & us & t & rs
    end repeat
  end tell
end tell
return out`,
  );
  const windows = raw
    .split("\u001E")
    .map((line) => line.replace(/^[\r\n]+/, "").split("\u001F"))
    .filter((fields) => fields.length >= 2)
    .map(([index, title]) => ({ index: Number(index), title }));
  // Titles look like "Chat | Notes | Microsoft Teams" (main window, view first),
  // "Notes | Microsoft Teams" (the meeting) and "Kompakte Besprechungsansicht |
  // Notes | Microsoft Teams" (the floating mini window, which names the meeting).
  // Only the known suffix and prefixes are taken off, so a subject that contains
  // "|" itself ("Design | Review") stays whole.
  const body = (title: string) => title.replace(/\s*\|\s*Microsoft Teams\s*$/i, "").trim();
  const prefixed = (title: string) => {
    const match = body(title).match(/^([^|]+?)\s*\|\s*(.+)$/);
    return match ? { prefix: match[1].trim(), rest: match[2].trim() } : undefined;
  };
  const isMain = (title: string) => {
    const p = prefixed(title);
    return Boolean(p && MAIN_VIEWS.has(p.prefix.toLowerCase().normalize("NFC")));
  };
  const isCompact = (title: string) => {
    const p = prefixed(title);
    return Boolean(p && /compact|kompakt/i.test(p.prefix));
  };
  const compact = windows.find((w) => isCompact(w.title));
  // The mini window names the running meeting: pick the window with exactly that title.
  const meetingName = compact ? prefixed(compact.title)?.rest : undefined;
  const candidates = windows.filter((w) => w.title && !isCompact(w.title));
  const others = candidates.filter((w) => !isMain(w.title));
  // Without a mini window the meeting window is usually the one on top already.
  const call =
    (meetingName ? candidates.find((w) => body(w.title) === meetingName) : undefined) ??
    (!compact && windows[0] && others.includes(windows[0]) ? windows[0] : undefined) ??
    (others.length === 1 ? others[0] : undefined);
  if (!call) {
    // Lists what Teams reports, so a window naming we do not know yet can be added.
    const seen = windows.map((w) => `${w.index}: "${w.title}"`).join("; ");
    throw new TeamsError(
      others.length > 1
        ? `Several Teams windows could be the call, so none was picked. Teams windows: ${seen}`
        : `No Teams call or meeting window is open. Teams windows: ${seen || "none"}`,
    );
  }
  await runAppleScript(
    `tell application "System Events"
  tell (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)})
    set w to window ${call.index}
    try
      set value of attribute "AXMinimized" of w to false
    end try
    set frontmost to true
    perform action "AXRaise" of w
  end tell
end tell`,
  );
  return body(call.title);
}

/**
 * Opens a teams.microsoft.com link in the desktop app instead of the browser.
 * The msteams: scheme is what the "Open in app" button on the web page uses.
 */
export async function openInTeams(httpsUrl: string): Promise<void> {
  if (!(await isTeamsRunning()) && !(await isTeamsInstalled())) {
    throw new TeamsError(
      "Microsoft Teams is not installed. Microsoft Teams Keys works with the new Teams desktop app.",
    );
  }
  await open(httpsUrl.replace(/^https?:/i, "msteams:"));
}
