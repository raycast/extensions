import { closeMainWindow, LocalStorage, PopToRootType } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const run = promisify(execFile);

export type MouseButton = "left" | "right" | "middle";
type Phase = "down" | "up";

/** When a held button is released, besides running the command again. */
export type ReleaseMode = "toggle" | "click" | "timer";

export const BUTTON_LABELS: Record<MouseButton, string> = { left: "Left", right: "Right", middle: "Middle" };

/** CoreGraphics event types and button numbers for each mouse button. */
const EVENTS: Record<MouseButton, { down: number; up: number; button: number }> = {
  left: { down: 1, up: 2, button: 0 }, // kCGEventLeftMouseDown / Up, kCGMouseButtonLeft
  right: { down: 3, up: 4, button: 1 }, // kCGEventRightMouseDown / Up, kCGMouseButtonRight
  middle: { down: 25, up: 26, button: 2 }, // kCGEventOtherMouseDown / Up, kCGMouseButtonCenter
};

/** A watcher never keeps a button down longer than this, even if no click comes. */
const MAX_HOLD_SECONDS = 600;

/**
 * JavaScript for Automation that posts mouse button events at the current pointer position.
 *
 * JXA can call CoreGraphics directly, so no helper app is needed. Posting events uses the Accessibility
 * permission Raycast already has. The event flags are cleared so the modifier keys of the hotkey that
 * triggered the command (⌥, ⌘ …) are not sent along with the click.
 */
function postScript(button: MouseButton, phases: Phase[]) {
  const e = EVENTS[button];
  return `
(() => {
  const location = $.CGEventGetLocation($.CGEventCreate(null));
  for (const type of [${phases.map((p) => e[p]).join(", ")}]) {
    const event = $.CGEventCreateMouseEvent(null, type, location, ${e.button});
    $.CGEventSetFlags(event, 0);
    $.CGEventPost(0, event); // kCGHIDEventTap
  }
})();`;
}

async function post(button: MouseButton, phases: Phase[]) {
  await run("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    `ObjC.import("CoreGraphics");${postScript(button, phases)}`,
  ]);
}

/**
 * Starts a small background script that releases the button later, so the Raycast command can finish.
 * "click" waits for the next physical click on the trackpad or mouse (left or right button pressed and
 * released), "timer" waits a fixed number of seconds. Returns the process id and a random tag that is part
 * of the script, so a later release can make sure the process is still this watcher before stopping it.
 */
function startWatcher(button: MouseButton, mode: "click" | "timer", seconds: number): Watcher | undefined {
  // The watched button: a physical left click releases middle and right holds; a left hold waits for a right click.
  const watch = button === "left" ? 1 : 0;
  const wait =
    mode === "timer"
      ? `delay(${Math.max(0.1, seconds)});`
      : `
const pressed = () => $.CGEventSourceButtonState(1, ${watch}); // kCGEventSourceStateHIDSystemState
const deadline = Date.now() + ${MAX_HOLD_SECONDS * 1000};
delay(0.3);
while (pressed() && Date.now() < deadline) delay(0.02);
while (!pressed() && Date.now() < deadline) delay(0.02);
while (pressed() && Date.now() < deadline) delay(0.02);`;
  const tag = randomUUID();
  const script = `/* trackpad-mouse-tools watcher ${tag} */ObjC.import("CoreGraphics");${wait}${postScript(button, ["up"])}`;
  const child = spawn("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child.pid === undefined ? undefined : { pid: child.pid, tag };
}

interface Watcher {
  pid: number;
  tag: string;
}

/**
 * Whether the process is still the watcher this extension started. Checking the process id alone is not
 * enough: once the watcher has exited, macOS can hand the same id to an unrelated process.
 */
async function isWatcherRunning(watcher: Watcher | undefined): Promise<boolean> {
  if (!watcher?.pid || !watcher.tag) return false;
  try {
    const { stdout } = await run("/bin/ps", ["-ww", "-p", String(watcher.pid), "-o", "command="]);
    return stdout.includes(watcher.tag);
  } catch {
    return false; // ps exits with an error when no process has this id
  }
}

async function stopWatcher(watcher: Watcher | undefined) {
  if (!watcher || !(await isWatcherRunning(watcher))) return;
  try {
    process.kill(watcher.pid);
  } catch {
    // It exited in the meantime.
  }
}

/** Closes Raycast so the click lands on the app under the pointer. */
async function getOutOfTheWay() {
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  await new Promise((resolve) => setTimeout(resolve, 150)); // let the previous app regain focus
}

export async function click(button: MouseButton) {
  await getOutOfTheWay();
  await post(button, ["down", "up"]);
}

const heldKey = (button: MouseButton) => `held-${button}`;
interface HoldState {
  watcher?: Watcher;
}

async function readHold(button: MouseButton): Promise<HoldState | undefined> {
  const raw = await LocalStorage.getItem<string>(heldKey(button));
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as HoldState;
  } catch {
    return {};
  }
}

/**
 * Presses the button and keeps it down, or releases it if this extension is holding it.
 * Returns true when the button is held afterwards.
 */
export async function toggleHold(button: MouseButton, mode: ReleaseMode, seconds: number): Promise<boolean> {
  await getOutOfTheWay();
  const state = await readHold(button);

  if (state) {
    await LocalStorage.removeItem(heldKey(button));
    const watcherAlive = await isWatcherRunning(state.watcher);
    if (state.watcher === undefined || watcherAlive) {
      if (watcherAlive) await stopWatcher(state.watcher);
      await post(button, ["up"]);
      return false;
    }
    // The watcher already released the button on its own, so this run starts a new hold.
  }

  await post(button, ["down"]);
  const watcher = mode === "toggle" ? undefined : startWatcher(button, mode, seconds);
  await LocalStorage.setItem(heldKey(button), JSON.stringify({ watcher } satisfies HoldState));
  return true;
}

/** Releases every button, in case a hold got out of sync. */
export async function releaseAll() {
  await getOutOfTheWay();
  for (const button of Object.keys(EVENTS) as MouseButton[]) {
    const state = await readHold(button);
    await stopWatcher(state?.watcher);
    await LocalStorage.removeItem(heldKey(button));
    await post(button, ["up"]);
  }
}
