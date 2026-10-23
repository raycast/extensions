import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Names must match `Button.name` / `ButtonAction.name` in helper/Sources/WaveProtocol.
export const BUTTONS = [
  { id: "top", title: "Top" },
  { id: "middle", title: "Middle" },
  { id: "bottom", title: "Bottom" },
] as const;

/** Swipe gestures, mapped like buttons; names match `SwipeSlot` in the helper. */
export const SWIPES = [
  { id: "swipeLeft", title: "Swipe Left" },
  { id: "swipeRight", title: "Swipe Right" },
] as const;

/** Something that can carry a mapping: a physical button or a swipe. */
export type ButtonId = (typeof BUTTONS)[number]["id"] | (typeof SWIPES)[number]["id"];

/**
 * What a button does. Each button has one mapping, triggered by Click or Hold:
 * dictation holds-to-talk or toggles on clicks, links and keys fire on press.
 */
export type UrlTarget = { url: string };
/** `app` sends this button's dictation to its own app instead of the default one. */
export type DictateTarget = { command: "dictate"; submit?: boolean; app?: DictationApp };

// Wave for Work's actions. Names must match `SlideAction` / `MediaKey.command` in the helper.
export const BUILT_IN_ACTIONS = [
  { id: "nextSlide", title: "Next Slide", group: "Slides" },
  { id: "previousSlide", title: "Previous Slide", group: "Slides" },
  { id: "startSlideshow", title: "Start Slideshow", group: "Slides" },
  { id: "blackScreen", title: "Black Screen", group: "Slides" },
  { id: "whiteScreen", title: "White Screen", group: "Slides" },
  { id: "playPause", title: "Play/Pause", group: "Media" },
  { id: "nextTrack", title: "Next Track", group: "Media" },
  { id: "previousTrack", title: "Previous Track", group: "Media" },
  { id: "muteAudio", title: "Mute Audio", group: "Media" },
  // Hold the button and turn your wrist; Wave for Work's "Volume".
  { id: "volume", title: "Volume (Hold & Turn)", group: "Media" },
] as const;
export type BuiltInId = (typeof BUILT_IN_ACTIONS)[number]["id"];
/** The built-ins a slot can use: hold-and-turn volume needs a button to hold, so not on swipes. */
export const actionsFor = (slot: ButtonId) =>
  BUILT_IN_ACTIONS.filter((a) => a.id !== "volume" || !slot.startsWith("swipe"));

/** Slide keys go to the presentation app in the background; media keys to the active player. */
export type BuiltInTarget = { command: BuiltInId };
export type KeyTarget = { key: KeyId; modifiers?: ModifierId[] };
export type Target = UrlTarget | DictateTarget | KeyTarget | BuiltInTarget;

/**
 * As stored. New mappings always use the helper's `hold` (click-or-hold)
 * gesture; files from earlier versions may still hold other per-event actions.
 */
export type Binding = { button: ButtonId; action: string } & Target;

export const isDictate = (b: Target): b is DictateTarget => "command" in b && b.command === "dictate";
export const isKey = (b: Target): b is KeyTarget => "key" in b;
export const isUrl = (b: Target): b is UrlTarget => "url" in b;
export const isBuiltIn = (b: Target): b is BuiltInTarget =>
  "command" in b && BUILT_IN_ACTIONS.some((a) => a.id === b.command);

// Names must match `KeyStroke.codes` / `KeyStroke.Modifier` in the helper.
export const KEYS = [
  { id: "right", title: "Right Arrow", symbol: "→" },
  { id: "left", title: "Left Arrow", symbol: "←" },
  { id: "up", title: "Up Arrow", symbol: "↑" },
  { id: "down", title: "Down Arrow", symbol: "↓" },
  { id: "space", title: "Space", symbol: "Space" },
  { id: "return", title: "Return", symbol: "↩" },
  { id: "escape", title: "Escape", symbol: "Esc" },
  { id: "tab", title: "Tab", symbol: "⇥" },
  { id: "delete", title: "Delete", symbol: "⌫" },
  { id: "pageUp", title: "Page Up", symbol: "PgUp" },
  { id: "pageDown", title: "Page Down", symbol: "PgDn" },
  { id: "home", title: "Home", symbol: "Home" },
  { id: "end", title: "End", symbol: "End" },
] as const;
export type KeyId = (typeof KEYS)[number]["id"];

/** In macOS display order (⌃⌥⇧⌘). */
export const MODIFIERS = [
  { id: "control", title: "Control", symbol: "⌃" },
  { id: "option", title: "Option", symbol: "⌥" },
  { id: "shift", title: "Shift", symbol: "⇧" },
  { id: "cmd", title: "Command", symbol: "⌘" },
] as const;
export type ModifierId = (typeof MODIFIERS)[number]["id"];

export function bindingsPath(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const base = env.XDG_CONFIG_HOME || join(home, ".config");
  return join(base, "genki-wave", "buttons.json");
}

/** Which ring to use; matches `DeviceChoice` in the helper. */
export type Device = { address: string; id?: string };

/** The app a dictation button types into; matches `DictationApp` in the helper. */
export type DictationApp = {
  bundleId: string;
  name: string;
  /**
   * Type into the app while it stays in the background (the default). `false` brings
   * it forward and pastes instead, for apps that ignore background typing.
   */
  background?: boolean;
};

/** Which hand the ring is on; swipes are mirrored for the left. Absent means right. */
export type Hand = "left" | "right";

type ConfigFile = {
  device?: Device;
  /** Rings the user forgot; the helper never auto-connects to them (`DeviceChoice.forgotten`). */
  forgotten?: string[];
  /** Before each dictation button had its own app; moved onto them by `migrateDictationApp`. */
  dictationApp?: DictationApp;
  hand?: "left";
  bindings: Binding[];
};

/** Why the config can't be used, if it exists but doesn't parse (e.g. a hand edit). */
export function configProblem(path = bindingsPath()): string | undefined {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
  try {
    JSON.parse(text);
    return undefined;
  } catch (e) {
    return `${path} can't be read: ${(e as Error).message}`;
  }
}

function readConfig(path: string): ConfigFile {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return {
      ...(parsed.device?.address ? { device: parsed.device } : {}),
      ...(parsed.dictationApp?.bundleId ? { dictationApp: parsed.dictationApp } : {}),
      ...(parsed.hand === "left" ? { hand: "left" as const } : {}),
      ...(Array.isArray(parsed.forgotten) && parsed.forgotten.length ? { forgotten: parsed.forgotten } : {}),
      bindings: Array.isArray(parsed.bindings) ? parsed.bindings : [],
    };
  } catch {
    return { bindings: [] };
  }
}

function writeConfig(path: string, config: ConfigFile) {
  // Saving over a file that doesn't parse would wipe every mapping in it.
  const problem = configProblem(path);
  if (problem) throw new Error(problem);
  mkdirSync(dirname(path), { recursive: true });
  // The helper re-reads on every button event; never let it see a half-written file.
  // Per process, as the menu bar and Configure Wave run side by side.
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(config, null, 2) + "\n");
  renameSync(tmp, path);
}

export const readBindings = (path = bindingsPath()): Binding[] => readConfig(path).bindings;
export const readDevice = (path = bindingsPath()): Device | undefined => readConfig(path).device;

/** Changes some fields and keeps the rest; `undefined` removes a field. */
function updateConfig(path: string, patch: Partial<ConfigFile>) {
  const { device, forgotten, dictationApp, hand, bindings } = { ...readConfig(path), ...patch };
  writeConfig(path, { device, forgotten: forgotten?.length ? forgotten : undefined, dictationApp, hand, bindings });
}

const writeBindings = (path: string, bindings: Binding[]) => updateConfig(path, { bindings });

/** The shared dictation app from before each button had its own, until it's migrated. */
export const readLegacyDictationApp = (path = bindingsPath()): DictationApp | undefined =>
  readConfig(path).dictationApp;

export const readForgotten = (path = bindingsPath()): string[] => readConfig(path).forgotten ?? [];

/** Choosing a ring also takes it off the forgotten list. */
export function setDevice(path: string, device: Device | undefined) {
  const address = device?.address.toUpperCase();
  updateConfig(path, { device, forgotten: readForgotten(path).filter((a) => a !== address) });
}

/**
 * Keeps the helper from connecting to a ring by itself again: the chosen ring by
 * default, or any ring by address. Forgetting the chosen ring also clears the choice.
 */
export function forgetDevice(path: string, address = readDevice(path)?.address) {
  if (!address) return;
  const upper = address.toUpperCase();
  const forgotten = readForgotten(path);
  const chosen = readDevice(path);
  updateConfig(path, {
    device: chosen?.address.toUpperCase() === upper ? undefined : chosen,
    forgotten: forgotten.includes(upper) ? forgotten : [...forgotten, upper],
  });
}

export const readHand = (path = bindingsPath()): Hand => readConfig(path).hand ?? "right";
export const setHand = (path: string, hand: Hand) => updateConfig(path, { hand: hand === "left" ? "left" : undefined });

/** The button's mapping: its Click-or-Hold binding, else a legacy per-event one. */
export function mappingFor(bindings: Binding[], button: ButtonId): Binding | undefined {
  const onButton = bindings.filter((b) => b.button === button);
  return onButton.find((b) => b.action === "hold") ?? onButton[0];
}

/** Replaces everything on `button` (including legacy per-event bindings) with one mapping. */
export function setMapping(path: string, button: ButtonId, target: Target) {
  const others = readBindings(path).filter((b) => b.button !== button);
  writeBindings(path, [...others, { button, action: "hold", ...target }]);
}

/** Changes the app a dictation button types into; other mappings have no app. */
export function setButtonApp(path: string, button: ButtonId, app: DictationApp) {
  const current = mappingFor(readBindings(path), button);
  if (!current || !isDictate(current)) return;
  const others = readBindings(path).filter((b) => b.button !== button);
  writeBindings(path, [...others, { ...current, app }]);
}

/** Dictation buttons that don't know where to type yet. */
export const dictationWithoutApp = (bindings: Binding[]): ButtonId[] =>
  bindings.filter((b) => isDictate(b) && !b.app).map((b) => b.button);

/**
 * Configs from before each button had its own app share one `dictationApp`: give it to
 * every dictation button without one, and drop it. Returns whether anything changed.
 */
export function migrateDictationApp(path = bindingsPath()): boolean {
  const { dictationApp, bindings } = readConfig(path);
  if (!dictationApp) return false;
  updateConfig(path, {
    dictationApp: undefined,
    bindings: bindings.map((b) => (isDictate(b) && !b.app ? { ...b, app: dictationApp } : b)),
  });
  return true;
}

export function clearMapping(path: string, button: ButtonId) {
  writeBindings(
    path,
    readBindings(path).filter((b) => b.button !== button),
  );
}

const SLOTS = [...BUTTONS, ...SWIPES];

export const buttonTitle = (button: ButtonId) => SLOTS.find((b) => b.id === button)?.title ?? button;

export const PRESETS = {
  /** Slides in Keynote, PowerPoint, Google Slides or PDF viewers, plus dictation on the bottom button. */
  presentation: {
    top: { command: "previousSlide" },
    middle: { command: "nextSlide" },
    bottom: { command: "dictate", submit: true },
    swipeLeft: { command: "previousSlide" },
    swipeRight: { command: "nextSlide" },
  },
} satisfies Record<string, Record<ButtonId, Target>>;

export type PresetId = keyof typeof PRESETS;

const same = (b: Binding, button: ButtonId, target: Target) =>
  JSON.stringify(b) === JSON.stringify({ button, action: "hold", ...target });

/** Current mappings a preset would overwrite with something different. */
export function presetWouldReplace(bindings: Binding[], preset: PresetId): Binding[] {
  const layout: Record<ButtonId, Target> = PRESETS[preset];
  return SLOTS.flatMap(({ id }) => {
    const current = mappingFor(bindings, id);
    return current && !same(current, id, layout[id]) ? [current] : [];
  });
}

export function applyPreset(path: string, preset: PresetId) {
  const layout: Record<ButtonId, Target> = PRESETS[preset];
  // A preset can't know where to dictate; use the app another button already types into.
  const app = readBindings(path).find((b): b is Binding & DictateTarget => isDictate(b) && !!b.app)?.app;
  for (const { id } of SLOTS) {
    const target = layout[id];
    setMapping(path, id, app && isDictate(target) ? { ...target, app } : target);
  }
}
