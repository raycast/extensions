import { environment } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { listSpaces } from "./native";
import { SpaceInfo } from "./format";

/**
 * Enables the macOS "Switch to Desktop N" shortcuts (Control + digit) so that
 * "Go to Space" works. Switching is purely position-based: the shortcut for a
 * space is derived from its current position in the macOS space order (its
 * index), so reordering desktops in Mission Control is followed automatically —
 * nothing is stored per space.
 *
 * Still requires Accessibility permission for Raycast (macOS asks on first
 * switch) — that cannot be granted programmatically.
 *
 * All system tools are invoked by absolute path with an explicit environment:
 * Raycast spawns extension processes with a stripped PATH, so bare command
 * names ("defaults", "killall") would fail with ENOENT.
 */

// Absolute paths — Raycast's spawned processes don't have a usable PATH.
const DEFAULTS = "/usr/bin/defaults";
const PLUTIL = "/usr/bin/plutil";
const KILLALL = "/usr/bin/killall";
const ACTIVATE_SETTINGS = "/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings";

function sysEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: process.env.HOME || homedir(),
    PATH: `${process.env.PATH ? process.env.PATH + ":" : ""}/usr/bin:/bin:/usr/sbin:/sbin`,
  };
}

const CONTROL_FLAG = 262144;
const OPTION_FLAG = 524288;
const CONTROL_MODIFIER = ["control down"];
const CONTROL_OPTION_MODIFIER = ["control down", "option down"];

interface SwitchDefault {
  /** AppleScript / virtual key code of the digit. */
  keyCode: number;
  /** AppleScript modifiers for the synthesized switch keystroke. */
  modifiers: string[];
  /** Matching modifier flag for the macOS symbolic hotkey. */
  flag: number;
}

// index (1-based) -> default switch shortcut.
// Indexes 1–10 are Control + the matching digit (10 uses the "0" key).
// Index 11 is Control + Option + "1", matching macOS "Switch to Desktop 11".
const DIGIT_KEYCODE: Record<number, SwitchDefault> = {
  1: { keyCode: 18, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  2: { keyCode: 19, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  3: { keyCode: 20, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  4: { keyCode: 21, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  5: { keyCode: 23, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  6: { keyCode: 22, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  7: { keyCode: 26, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  8: { keyCode: 28, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  9: { keyCode: 25, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  10: { keyCode: 29, modifiers: CONTROL_MODIFIER, flag: CONTROL_FLAG },
  11: { keyCode: 18, modifiers: CONTROL_OPTION_MODIFIER, flag: CONTROL_FLAG + OPTION_FLAG },
};

function setupMarker(): string {
  // Bump the suffix to re-run the one-time first-run setup (e.g. after adding a
  // new step like disabling auto-rearrange) for existing installs.
  return join(environment.supportPath, ".switch-shortcuts-enabled-v2");
}

/**
 * The keyboard shortcut that switches to the space at a given position (1-based
 * index in the macOS space order), or undefined if the position is out of range
 * (only 1–11 are switchable). Position-based, so it always follows reordering.
 */
export function switchShortcutForIndex(index: number): { keyCode: number; modifiers: string[] } | undefined {
  const def = DIGIT_KEYCODE[index];
  return def ? { keyCode: def.keyCode, modifiers: def.modifiers } : undefined;
}

/** Enables the macOS "Switch to Desktop N" shortcuts (Control + digit). Throws on failure. */
export function enableSystemShortcuts(spaces: SpaceInfo[]): void {
  const env = sysEnv();
  let wrote = false;
  for (const sp of spaces) {
    const def = DIGIT_KEYCODE[sp.index];
    if (!def) continue;
    const hotkeyId = String(117 + sp.index); // 118 = Desktop 1, 119 = Desktop 2, …
    execFileSync(
      DEFAULTS,
      [
        "write",
        "com.apple.symbolichotkeys",
        "AppleSymbolicHotKeys",
        "-dict-add",
        hotkeyId,
        `{enabled=1;value={type=standard;parameters=(65535,${def.keyCode},${def.flag});};}`,
      ],
      { timeout: 5000, env },
    );
    wrote = true;
  }
  if (wrote) {
    execFileSync(ACTIVATE_SETTINGS, ["-u"], { timeout: 5000, env });
  }
}

/** True when the "Switch to Desktop N" shortcut is enabled for every space (index 1–11). */
export function areSystemShortcutsEnabled(spaces: SpaceInfo[]): boolean {
  const ids = spaces
    .map((s) => s.index)
    .filter((i) => DIGIT_KEYCODE[i])
    .map((i) => String(117 + i));
  if (ids.length === 0) return true;
  try {
    const env = sysEnv();
    const xml = execFileSync(DEFAULTS, ["export", "com.apple.symbolichotkeys", "-"], {
      encoding: "utf8",
      timeout: 5000,
      env,
    });
    const json = execFileSync(PLUTIL, ["-convert", "json", "-o", "-", "-"], {
      input: xml,
      encoding: "utf8",
      timeout: 5000,
      env,
    });
    const data = (JSON.parse(json).AppleSymbolicHotKeys ?? {}) as Record<string, { enabled?: unknown }>;
    return ids.every((id) => {
      const e = data[id];
      return !!e && (e.enabled === 1 || e.enabled === true);
    });
  } catch {
    return false;
  }
}

/** True when macOS "Automatically rearrange Spaces based on most recent use" is ON (the default). */
export function isAutoRearrangeOn(): boolean {
  try {
    const out = execFileSync(DEFAULTS, ["read", "com.apple.dock", "mru-spaces"], {
      encoding: "utf8",
      timeout: 5000,
      env: sysEnv(),
    }).trim();
    return out !== "0" && out.toLowerCase() !== "false";
  } catch {
    return true; // unset => default ON
  }
}

/** Turns off auto-rearrange so space numbering stays stable (restarts the Dock). */
export function disableAutoRearrange(): void {
  const env = sysEnv();
  execFileSync(DEFAULTS, ["write", "com.apple.dock", "mru-spaces", "-bool", "false"], { timeout: 5000, env });
  try {
    execFileSync(KILLALL, ["Dock"], { timeout: 5000, env });
  } catch {
    // Dock relaunches on its own
  }
}

/** Applies every OS change needed for switching (system shortcuts, auto-rearrange off). */
export function runFullSetup(spaces: SpaceInfo[]): void {
  enableSystemShortcuts(spaces);
  if (isAutoRearrangeOn()) disableAutoRearrange();
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    writeFileSync(setupMarker(), "", "utf8");
  } catch {
    // ignore
  }
}

/**
 * Called automatically on command load. Exactly once (gated by a marker file),
 * enables the macOS "Switch to Desktop N" shortcuts and turns off "Automatically
 * rearrange Spaces" so desktop numbering stays stable. Switching itself is
 * position-based (see switchShortcutForIndex), so nothing is stored per space.
 *
 * Accessibility permission is the only remaining requirement, and it cannot be
 * granted programmatically — macOS prompts for it on the first switch keystroke.
 */
export function ensureSwitchDefaults(): void {
  let spaces: SpaceInfo[];
  try {
    spaces = listSpaces();
  } catch {
    return;
  }
  if (spaces.length === 0) return;

  if (!existsSync(setupMarker())) {
    try {
      enableSystemShortcuts(spaces);
      // Stable numbering is required for Ctrl+N to map to the right desktop.
      // Restarts the Dock, but only this once (marker-gated below).
      if (isAutoRearrangeOn()) disableAutoRearrange();
      mkdirSync(environment.supportPath, { recursive: true });
      writeFileSync(setupMarker(), "", "utf8");
    } catch {
      // leave the marker unset so it retries next time
    }
  }
}

/** Manual re-apply: re-enable the macOS "Switch to Desktop N" shortcuts. Returns how many spaces are switchable. */
export function setUpSwitching(spaces: SpaceInfo[]): number {
  enableSystemShortcuts(spaces);
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    writeFileSync(setupMarker(), "", "utf8");
  } catch {
    // ignore
  }
  return spaces.filter((s) => DIGIT_KEYCODE[s.index]).length;
}
