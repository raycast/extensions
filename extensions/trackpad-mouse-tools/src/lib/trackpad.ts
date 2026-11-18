import { LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Built-in trackpad (MacBook) and Magic Trackpad (Bluetooth). */
const TRACKPAD_DOMAINS = ["com.apple.AppleMultitouchTrackpad", "com.apple.driver.AppleBluetoothMultitouch.trackpad"];
const GLOBAL = "NSGlobalDomain";
const DOCK = "com.apple.dock";

/** Makes macOS pick up changed defaults without logging out. */
const ACTIVATE_SETTINGS = "/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings";

type DefaultsType = "bool" | "int" | "float";
type DefaultsValue = boolean | number;

// ---------- Low level ----------

async function readDefault(domain: string, key: string, currentHost = false): Promise<string | undefined> {
  const args = [...(currentHost ? ["-currentHost"] : []), "read", domain, key];
  try {
    const { stdout } = await run("/usr/bin/defaults", args);
    return stdout.trim();
  } catch {
    return undefined; // key not set → macOS default applies
  }
}

async function writeDefault(
  domain: string,
  key: string,
  type: DefaultsType,
  value: DefaultsValue,
  currentHost = false,
) {
  const v = type === "bool" ? (value ? "true" : "false") : String(value);
  const args = [...(currentHost ? ["-currentHost"] : []), "write", domain, key, `-${type}`, v];
  await run("/usr/bin/defaults", args);
}

/** Writes a key to both trackpad domains. */
async function writeTrackpad(key: string, type: DefaultsType, value: DefaultsValue) {
  await Promise.all(TRACKPAD_DOMAINS.map((d) => writeDefault(d, key, type, value)));
}

/** Writes a key to NSGlobalDomain, both regular and -currentHost. */
async function writeGlobal(key: string, type: DefaultsType, value: DefaultsValue) {
  await writeDefault(GLOBAL, key, type, value);
  await writeDefault(GLOBAL, key, type, value, true);
}

const readTrackpad = (key: string) => readDefault(TRACKPAD_DOMAINS[0], key);

const asBool = (v: string | undefined, fallback = false) => (v === undefined ? fallback : v === "1" || v === "true");
const asNum = (v: string | undefined, fallback: number) => (v === undefined || isNaN(Number(v)) ? fallback : Number(v));

/** Applies changes immediately. Returns false if macOS did not accept the live reload. */
export async function applySettings(restartDock = false): Promise<boolean> {
  if (restartDock) {
    // Mission Control, App Exposé and Show Desktop gestures are read by the Dock.
    await run("/usr/bin/killall", ["Dock"]).catch(() => undefined);
  }
  try {
    await run(ACTIVATE_SETTINGS, ["-u"]);
    return true;
  } catch {
    return false;
  }
}

// ---------- Secondary click ----------

export type RightClickMode = "two-finger" | "bottom-right" | "bottom-left" | "off";

export const RIGHT_CLICK_LABELS: Record<RightClickMode, string> = {
  "two-finger": "Two Fingers",
  "bottom-right": "Bottom Right Corner",
  "bottom-left": "Bottom Left Corner",
  off: "Off",
};

export async function getRightClickMode(): Promise<RightClickMode> {
  const corner = asNum(await readTrackpad("TrackpadCornerSecondaryClick"), 0);
  const twoFinger = asBool(await readTrackpad("TrackpadRightClick"), true);
  if (corner === 2) return "bottom-right";
  if (corner === 1) return "bottom-left";
  if (twoFinger) return "two-finger";
  return "off";
}

async function writeRightClickMode(mode: RightClickMode) {
  const corner = mode === "bottom-right" ? 2 : mode === "bottom-left" ? 1 : 0;
  await writeTrackpad("TrackpadRightClick", "bool", mode === "two-finger");
  await writeTrackpad("TrackpadCornerSecondaryClick", "int", corner);
  await writeGlobal("com.apple.trackpad.enableSecondaryClick", "bool", mode !== "off");
  await writeGlobal("com.apple.trackpad.trackpadCornerClickBehavior", "int", corner === 0 ? 0 : 1);
}

export async function setRightClickMode(mode: RightClickMode): Promise<boolean> {
  await writeRightClickMode(mode);
  return applySettings();
}

// ---------- Generic settings model ----------

export type SectionId = "click" | "scroll" | "gestures" | "mouse" | "accessibility";

export const SECTION_TITLES: Record<SectionId, string> = {
  click: "Trackpad · Point & Click",
  scroll: "Trackpad · Scroll & Zoom",
  gestures: "Trackpad · More Gestures",
  mouse: "Mouse",
  accessibility: "Accessibility",
};

export interface Choice {
  value: string;
  title: string;
}

export interface Setting {
  id: string;
  section: SectionId;
  title: string;
  subtitle?: string;
  /** Boolean settings use the values "on" and "off". */
  kind: "bool" | "choice" | "stepper";
  choices: Choice[];
  /** macOS default, used by "Reset All". */
  defaultValue: string;
  read: () => Promise<string>;
  write: (value: string) => Promise<void>;
  restartDock?: boolean;
}

const BOOL: Choice[] = [
  { value: "on", title: "On" },
  { value: "off", title: "Off" },
];
const b = (v: boolean) => (v ? "on" : "off");

/** Boolean key in the trackpad domains. */
function trackpadBool(key: string, fallback: boolean) {
  return {
    read: async () => b(asBool(await readTrackpad(key), fallback)),
    write: async (v: string) => writeTrackpad(key, "bool", v === "on"),
  };
}

/** Integer gesture key: on = onValue, off = 0. */
function trackpadGesture(key: string, onValue: number, fallback: number) {
  return {
    read: async () => b(asNum(await readTrackpad(key), fallback) !== 0),
    write: async (v: string) => writeTrackpad(key, "int", v === "on" ? onValue : 0),
  };
}

// --- Finger count for swipe gestures (full-screen apps horizontal, Mission Control vertical)

type Axis = "Horiz" | "Vert";
type FingerChoice = "three" | "four" | "off";
const FINGER_CHOICES: Choice[] = [
  { value: "three", title: "Three Fingers" },
  { value: "four", title: "Four Fingers" },
  { value: "off", title: "Off" },
];

async function readFingers(axis: Axis): Promise<FingerChoice> {
  const three = asNum(await readTrackpad(`TrackpadThreeFinger${axis}SwipeGesture`), 2);
  const four = asNum(await readTrackpad(`TrackpadFourFinger${axis}SwipeGesture`), 2);
  if (three === 2) return "three";
  if (four === 2) return "four";
  return "off";
}

async function writeFingers(axis: Axis, v: FingerChoice) {
  // Three-finger drag occupies three fingers, so fall back to four like macOS does.
  if (v === "three" && asBool(await readTrackpad("TrackpadThreeFingerDrag"))) v = "four";
  await writeTrackpad(`TrackpadThreeFinger${axis}SwipeGesture`, "int", v === "three" ? 2 : 0);
  await writeTrackpad(`TrackpadFourFinger${axis}SwipeGesture`, "int", v === "four" ? 2 : 0);
  if (axis === "Vert") {
    await writeDefault(DOCK, "showMissionControlGestureEnabled", "bool", v !== "off");
  }
}

/**
 * Swipes that three-finger drag moved from three to four fingers. Only these go back to three fingers when
 * drag is turned off again; swipes the user put on four fingers themselves stay there.
 */
const MOVED_SWIPES_KEY = "swipes-moved-by-drag";

async function readMovedSwipes(): Promise<Axis[]> {
  try {
    const raw = await LocalStorage.getItem<string>(MOVED_SWIPES_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((a): a is Axis => a === "Horiz" || a === "Vert") : [];
  } catch {
    return [];
  }
}

async function saveMovedSwipes(axes: Axis[]) {
  if (axes.length === 0) await LocalStorage.removeItem(MOVED_SWIPES_KEY);
  else await LocalStorage.setItem(MOVED_SWIPES_KEY, JSON.stringify(axes));
}

/**
 * A swipe the user sets explicitly is theirs again. The one exception: three fingers while three-finger drag
 * is on. The swipe has to go to four fingers for now, so it is remembered and moves back to three fingers
 * once drag is turned off.
 */
async function writeSwipeChoice(axis: Axis, v: FingerChoice) {
  await writeFingers(axis, v);
  const others = (await readMovedSwipes()).filter((a) => a !== axis);
  const heldByDrag = v === "three" && asBool(await readTrackpad("TrackpadThreeFingerDrag"));
  await saveMovedSwipes(heldByDrag ? [...others, axis] : others);
}

// --- Dragging style (Accessibility → Pointer Control → Trackpad Options)

export type DragStyle = "off" | "tap" | "tap-lock" | "three-finger";
const DRAG_CHOICES: Choice[] = [
  { value: "off", title: "Off" },
  { value: "tap", title: "Without Drag Lock" },
  { value: "tap-lock", title: "With Drag Lock" },
  { value: "three-finger", title: "Three Finger Drag" },
];

export async function readDragStyle(): Promise<DragStyle> {
  if (asBool(await readTrackpad("TrackpadThreeFingerDrag"))) return "three-finger";
  if (!asBool(await readTrackpad("Dragging"))) return "off";
  return asBool(await readTrackpad("DragLock")) ? "tap-lock" : "tap";
}

async function writeDragStyle(v: DragStyle) {
  const wasThreeFinger = asBool(await readTrackpad("TrackpadThreeFingerDrag"));
  await writeTrackpad("TrackpadThreeFingerDrag", "bool", v === "three-finger");
  await writeTrackpad("Dragging", "bool", v === "tap" || v === "tap-lock");
  await writeTrackpad("DragLock", "bool", v === "tap-lock");
  if (v === "three-finger" && !wasThreeFinger) {
    // Move three-finger swipes to four fingers, as macOS does, and remember which ones moved.
    const moved: Axis[] = [];
    for (const axis of ["Horiz", "Vert"] as const) {
      if ((await readFingers(axis)) === "three") {
        await writeFingers(axis, "four");
        moved.push(axis);
      }
    }
    await saveMovedSwipes(moved);
  } else if (v !== "three-finger" && wasThreeFinger) {
    // Three fingers are free again: only the swipes drag moved go back to three fingers.
    for (const axis of await readMovedSwipes()) {
      if ((await readFingers(axis)) === "four") await writeFingers(axis, "three");
    }
    await saveMovedSwipes([]);
  }
}

export async function setDragStyle(v: DragStyle) {
  await writeDragStyle(v);
  return applySettings(true);
}

// --- Tracking speed

export const SPEED_STEPS = [0, 0.125, 0.5, 0.6875, 0.875, 1, 1.5, 2, 2.5, 3];
const SPEED_CHOICES: Choice[] = SPEED_STEPS.map((s, i) => ({
  value: String(s),
  title: `${i + 1} / ${SPEED_STEPS.length}`,
}));

function nearestSpeed(v: number) {
  return SPEED_STEPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best));
}

// --- Mouse

/** Magic Mouse preferences live in two domains, like the trackpad ones. */
const MOUSE_DOMAINS = ["com.apple.driver.AppleBluetoothMultitouch.mouse", "com.apple.AppleMultitouchMouse"];

async function writeMouse(key: string, value: string) {
  await Promise.all(MOUSE_DOMAINS.map((d) => run("/usr/bin/defaults", ["write", d, key, "-string", value])));
}

/** Tracking speed steps of the System Settings slider (com.apple.mouse.scaling). */
const MOUSE_SPEED_STEPS = [0, 0.125, 0.5, 0.6875, 0.875, 1, 1.5, 2, 2.5, 3];

/** Scrolling speed steps (com.apple.scrollwheel.scaling). */
const SCROLL_SPEED_STEPS = [0, 0.125, 0.3125, 0.5, 0.75, 1, 1.7, 2.5, 5];

/** Double-click speed, ordered slow → fast; the value is the threshold in seconds. */
const DOUBLE_CLICK_STEPS = [5, 2.5, 1.5, 1.1, 0.8, 0.5, 0.35, 0.25, 0.15];

function stepChoices(steps: number[]): Choice[] {
  return steps.map((s, i) => ({ value: String(s), title: `${i + 1} / ${steps.length}` }));
}

function nearest(steps: number[], v: number) {
  return steps.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best));
}

/** A float preference in NSGlobalDomain shown as a stepper. */
function globalStepper(key: string, steps: number[], fallback: number) {
  return {
    kind: "stepper" as const,
    choices: stepChoices(steps),
    defaultValue: String(fallback),
    read: async () => String(nearest(steps, asNum(await readDefault(GLOBAL, key), fallback))),
    write: async (v: string) => writeDefault(GLOBAL, key, "float", Number(v)),
  };
}

// ---------- Registry ----------

export const SETTINGS: Setting[] = [
  // Point & Click
  {
    id: "rightClick",
    section: "click",
    title: "Secondary Click",
    subtitle: "Right click",
    kind: "choice",
    choices: (Object.keys(RIGHT_CLICK_LABELS) as RightClickMode[]).map((v) => ({
      value: v,
      title: RIGHT_CLICK_LABELS[v],
    })),
    defaultValue: "two-finger",
    read: getRightClickMode,
    write: (v) => writeRightClickMode(v as RightClickMode),
  },
  {
    id: "tapToClick",
    section: "click",
    title: "Tap to Click",
    subtitle: "Tap with one finger",
    kind: "bool",
    choices: BOOL,
    defaultValue: "off",
    read: async () => b(asBool(await readTrackpad("Clicking"))),
    write: async (v) => {
      await writeTrackpad("Clicking", "bool", v === "on");
      await writeGlobal("com.apple.mouse.tapBehavior", "int", v === "on" ? 1 : 0);
    },
  },
  {
    id: "lookup",
    section: "click",
    title: "Look Up & Data Detectors",
    kind: "choice",
    choices: [
      { value: "force", title: "Force Click with One Finger" },
      { value: "tap", title: "Tap with Three Fingers" },
      { value: "off", title: "Off" },
    ],
    defaultValue: "force",
    read: async () => {
      if (asNum(await readTrackpad("TrackpadThreeFingerTapGesture"), 0) === 2) return "tap";
      return asBool(await readDefault(GLOBAL, "com.apple.trackpad.forceClick"), true) ? "force" : "off";
    },
    write: async (v) => {
      // Each choice writes both keys, so the reader above always gets back what was chosen.
      await writeTrackpad("TrackpadThreeFingerTapGesture", "int", v === "tap" ? 2 : 0);
      await writeDefault(GLOBAL, "com.apple.trackpad.forceClick", "bool", v === "force");
    },
  },
  {
    id: "clickPressure",
    section: "click",
    title: "Click",
    subtitle: "Pressure",
    kind: "choice",
    choices: [
      { value: "0", title: "Light" },
      { value: "1", title: "Medium" },
      { value: "2", title: "Firm" },
    ],
    defaultValue: "1",
    read: async () => String(asNum(await readTrackpad("FirstClickThreshold"), 1)),
    write: async (v) => {
      await writeTrackpad("FirstClickThreshold", "int", Number(v));
      await writeTrackpad("SecondClickThreshold", "int", Number(v));
    },
  },
  {
    id: "trackingSpeed",
    section: "click",
    title: "Tracking Speed",
    kind: "stepper",
    choices: SPEED_CHOICES,
    defaultValue: "0.6875",
    read: async () => String(nearestSpeed(asNum(await readDefault(GLOBAL, "com.apple.trackpad.scaling"), 0.6875))),
    write: async (v) => writeDefault(GLOBAL, "com.apple.trackpad.scaling", "float", Number(v)),
  },
  {
    id: "forceClick",
    section: "click",
    title: "Force Click & Haptic Feedback",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    // Look Up uses com.apple.trackpad.forceClick, so this setting only touches ForceSuppressed.
    read: async () => b(!asBool(await readTrackpad("ForceSuppressed"), false)),
    write: async (v) => writeTrackpad("ForceSuppressed", "bool", v !== "on"),
  },

  // Scroll & Zoom
  {
    id: "naturalScrolling",
    section: "scroll",
    title: "Natural Scrolling",
    subtitle: "Also applies to the mouse",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    read: async () => b(asBool(await readDefault(GLOBAL, "com.apple.swipescrolldirection"), true)),
    write: async (v) => writeDefault(GLOBAL, "com.apple.swipescrolldirection", "bool", v === "on"),
  },
  {
    id: "pinchZoom",
    section: "scroll",
    title: "Zoom In or Out",
    subtitle: "Pinch with two fingers",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    ...trackpadBool("TrackpadPinch", true),
  },
  {
    id: "smartZoom",
    section: "scroll",
    title: "Smart Zoom",
    subtitle: "Double-tap with two fingers",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    ...trackpadGesture("TrackpadTwoFingerDoubleTapGesture", 1, 1),
  },
  {
    id: "rotate",
    section: "scroll",
    title: "Rotate",
    subtitle: "Rotate with two fingers",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    ...trackpadBool("TrackpadRotate", true),
  },

  // More Gestures
  {
    id: "swipePages",
    section: "gestures",
    title: "Swipe Between Pages",
    subtitle: "Scroll left or right with two fingers",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    read: async () => b(asBool(await readDefault(GLOBAL, "AppleEnableSwipeNavigateWithScrolls"), true)),
    write: async (v) => writeDefault(GLOBAL, "AppleEnableSwipeNavigateWithScrolls", "bool", v === "on"),
  },
  {
    id: "swipeSpaces",
    section: "gestures",
    title: "Swipe Between Full-Screen Apps",
    subtitle: "Swipe left or right",
    kind: "choice",
    choices: FINGER_CHOICES,
    defaultValue: "three",
    read: () => readFingers("Horiz"),
    write: (v) => writeSwipeChoice("Horiz", v as FingerChoice),
    restartDock: true,
  },
  {
    id: "missionControl",
    section: "gestures",
    title: "Mission Control",
    subtitle: "Swipe up",
    kind: "choice",
    choices: FINGER_CHOICES,
    defaultValue: "three",
    read: () => readFingers("Vert"),
    write: (v) => writeSwipeChoice("Vert", v as FingerChoice),
    restartDock: true,
  },
  {
    id: "appExpose",
    section: "gestures",
    title: "App Exposé",
    subtitle: "Swipe down, same fingers as Mission Control",
    kind: "bool",
    choices: BOOL,
    defaultValue: "off",
    read: async () => b(asBool(await readDefault(DOCK, "showAppExposeGestureEnabled"), false)),
    write: async (v) => writeDefault(DOCK, "showAppExposeGestureEnabled", "bool", v === "on"),
    restartDock: true,
  },
  {
    id: "notificationCenter",
    section: "gestures",
    title: "Notification Center",
    subtitle: "Swipe left from the right edge with two fingers",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    ...trackpadGesture("TrackpadTwoFingerFromRightEdgeSwipeGesture", 3, 3),
  },
  {
    id: "showDesktop",
    section: "gestures",
    title: "Show Desktop",
    subtitle: "Spread with thumb and three fingers",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    read: async () => b(asBool(await readDefault(DOCK, "showDesktopGestureEnabled"), true)),
    write: async (v) => {
      await writeDefault(DOCK, "showDesktopGestureEnabled", "bool", v === "on");
      await writeTrackpad("TrackpadFiveFingerPinchGesture", "int", v === "on" ? 2 : 0);
    },
    restartDock: true,
  },

  // Mouse
  {
    id: "mouseSpeed",
    section: "mouse",
    title: "Tracking Speed",
    subtitle: "Mouse pointer",
    ...globalStepper("com.apple.mouse.scaling", MOUSE_SPEED_STEPS, 0.875),
  },
  {
    id: "mouseScrollSpeed",
    section: "mouse",
    title: "Scrolling Speed",
    subtitle: "Mouse wheel and Magic Mouse",
    ...globalStepper("com.apple.scrollwheel.scaling", SCROLL_SPEED_STEPS, 0.3125),
  },
  {
    id: "doubleClickSpeed",
    section: "mouse",
    title: "Double-Click Speed",
    subtitle: "Mouse and trackpad",
    ...globalStepper("com.apple.mouse.doubleClickThreshold", DOUBLE_CLICK_STEPS, 0.5),
  },
  {
    id: "pointerAcceleration",
    section: "mouse",
    title: "Pointer Acceleration",
    subtitle: "Off moves the pointer at a constant rate",
    kind: "bool",
    choices: BOOL,
    defaultValue: "on",
    // macOS stores the inverse: com.apple.mouse.linear = true means acceleration is off.
    read: async () => b(!asBool(await readDefault(GLOBAL, "com.apple.mouse.linear"), false)),
    write: async (v) => writeDefault(GLOBAL, "com.apple.mouse.linear", "bool", v !== "on"),
  },
  {
    id: "magicMouseSecondaryClick",
    section: "mouse",
    title: "Secondary Click",
    subtitle: "Magic Mouse",
    kind: "choice",
    choices: [
      { value: "TwoButton", title: "Click Right Side" },
      { value: "TwoButtonSwapped", title: "Click Left Side" },
      { value: "OneButton", title: "Off" },
    ],
    defaultValue: "TwoButton",
    read: async () => (await readDefault(MOUSE_DOMAINS[0], "MouseButtonMode")) ?? "TwoButton",
    write: (v) => writeMouse("MouseButtonMode", v),
  },

  // Accessibility
  {
    id: "dragStyle",
    section: "accessibility",
    title: "Use Trackpad for Dragging",
    subtitle: "Dragging style",
    kind: "choice",
    choices: DRAG_CHOICES,
    defaultValue: "off",
    read: readDragStyle,
    write: (v) => writeDragStyle(v as DragStyle),
    restartDock: true,
  },
];

export async function readAll(): Promise<Record<string, string>> {
  const values = await Promise.all(SETTINGS.map((s) => s.read()));
  return Object.fromEntries(SETTINGS.map((s, i) => [s.id, values[i]]));
}

export async function setSetting(setting: Setting, value: string): Promise<boolean> {
  await setting.write(value);
  return applySettings(setting.restartDock);
}

export async function resetAll(): Promise<boolean> {
  // Dragging style first: while three-finger drag is on, three-finger swipes would be moved to four fingers.
  const ordered = [...SETTINGS].sort((a, b) => Number(b.id === "dragStyle") - Number(a.id === "dragStyle"));
  for (const s of ordered) await s.write(s.defaultValue);
  return applySettings(true);
}

/** Sets a stepper setting to a 1-based level, e.g. from a command argument. */
export async function setLevel(id: string, level: number): Promise<{ position: string; applied: boolean }> {
  const setting = SETTINGS.find((s) => s.id === id);
  if (!setting || setting.kind !== "stepper") throw new Error(`Unknown setting: ${id}`);
  const index = Math.max(0, Math.min(setting.choices.length - 1, Math.round(level) - 1));
  const applied = await setSetting(setting, setting.choices[index].value);
  return { position: setting.choices[index].title, applied };
}

export function choiceTitle(setting: Setting, value: string | undefined) {
  return setting.choices.find((c) => c.value === value)?.title ?? "—";
}

// ---------- Quick toggles ----------

export async function toggleBoolSetting(id: string): Promise<{ title: string; on: boolean; applied: boolean }> {
  const setting = SETTINGS.find((s) => s.id === id);
  if (!setting || setting.kind !== "bool") throw new Error(`Unknown setting: ${id}`);
  const next = (await setting.read()) === "on" ? "off" : "on";
  const applied = await setSetting(setting, next);
  return { title: setting.title, on: next === "on", applied };
}

/** Moves a stepper setting one step up or down; returns the new position for the HUD. */
export async function stepSetting(
  id: string,
  direction: 1 | -1,
): Promise<{ title: string; position: string; applied: boolean }> {
  const setting = SETTINGS.find((s) => s.id === id);
  if (!setting || setting.kind !== "stepper") throw new Error(`Unknown setting: ${id}`);
  const value = await setting.read();
  let current = setting.choices.findIndex((c) => c.value === value);
  if (current < 0) {
    // macOS may store a value between two steps: start from the closest one, never from the ends.
    const n = Number(value);
    const distances = setting.choices.map((c) => Math.abs(Number(c.value) - n));
    current = Number.isFinite(n) ? distances.indexOf(Math.min(...distances)) : 0;
  }
  const index = Math.max(0, Math.min(setting.choices.length - 1, current + direction));
  const applied = await setSetting(setting, setting.choices[index].value);
  return { title: setting.title, position: setting.choices[index].title, applied };
}
