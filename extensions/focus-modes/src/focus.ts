import { environment, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { listHelperShortcutIds, runShortcut, writeSignedHelperShortcut } from "./helper-shortcut";

export interface FocusMode {
  id: string;
  name: string;
  symbol?: string;
  tint?: string;
}

export interface FocusState {
  modes: FocusMode[];
  activeId?: string;
}

export const FULL_DISK_ACCESS_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
export const FOCUS_SETTINGS = "x-apple.systempreferences:com.apple.Focus-Settings.extension";

const DATABASE = join(homedir(), "Library/DoNotDisturb/DB");
const DO_NOT_DISTURB_ID = "com.apple.donotdisturb.mode.default";
const HELPER_ID_KEY = "helper-shortcut-id";

/** macOS only lets apps with Full Disk Access read the Focus database. */
export class FullDiskAccessError extends Error {
  constructor() {
    super("Raycast needs Full Disk Access to read your Focus modes");
  }
}

interface ModeConfigurations {
  data?: {
    modeConfigurations?: Record<
      string,
      { mode?: { name?: string; modeIdentifier?: string; symbolImageName?: string; tintColorName?: string } }
    >;
  }[];
}

interface Assertions {
  data?: {
    storeAssertionRecords?: {
      assertionStartDateTimestamp?: number;
      assertionDetails?: { assertionDetailsModeIdentifier?: string };
    }[];
  }[];
}

async function readDatabase<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(join(DATABASE, file), "utf8"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES") throw new FullDiskAccessError();
    if (code === "ENOENT") return undefined;
    throw error;
  }
}

export async function getFocusState(): Promise<FocusState> {
  const [configurations, assertions] = await Promise.all([
    readDatabase<ModeConfigurations>("ModeConfigurations.json"),
    readDatabase<Assertions>("Assertions.json"),
  ]);

  const modes = Object.entries(configurations?.data?.[0]?.modeConfigurations ?? {})
    .map(([id, { mode }]) => ({
      id: mode?.modeIdentifier ?? id,
      name: mode?.name ?? id,
      symbol: mode?.symbolImageName,
      tint: mode?.tintColorName,
    }))
    // Do Not Disturb first, like in Control Center, then alphabetically.
    .sort(
      (a, b) => Number(b.id === DO_NOT_DISTURB_ID) - Number(a.id === DO_NOT_DISTURB_ID) || a.name.localeCompare(b.name),
    );

  // Each Focus that's turned on adds an assertion, so the newest one is the Focus that's on now.
  const [newest] = [...(assertions?.data?.[0]?.storeAssertionRecords ?? [])].sort(
    (a, b) => (b.assertionStartDateTimestamp ?? 0) - (a.assertionStartDateTimestamp ?? 0),
  );
  return { modes, activeId: newest?.assertionDetails?.assertionDetailsModeIdentifier };
}

/** Installed copies of the helper shortcut, the one this extension added most recently first. */
async function getHelperIds(): Promise<string[]> {
  const ids = await listHelperShortcutIds();
  const preferred = await LocalStorage.getItem<string>(HELPER_ID_KEY);
  return preferred && ids.includes(preferred) ? [preferred, ...ids.filter((id) => id !== preferred)] : ids;
}

/**
 * Runs the helper and resolves with the copy that handled `input`. Resolves with undefined when
 * the helper isn't installed or was built before the requested mode existed.
 */
async function runHelper(input: string): Promise<string | undefined> {
  for (const id of await getHelperIds()) {
    if ((await runShortcut(id, input)) === "ok") return id;
  }
}

/** Runs the helper, first installing or updating it if it can't handle `input` yet. */
async function runHelperWithSetup(input: string, getModes: () => Promise<FocusMode[]>): Promise<boolean> {
  if (await runHelper(input)) return true;

  const isUpdate = (await listHelperShortcutIds()).length > 0;
  const file = await writeSignedHelperShortcut(await getModes(), environment.supportPath);
  await open(file, "com.apple.shortcuts");
  await showHUD(
    isUpdate
      ? "Click “Add Shortcut”, then “Replace” to update the Focus helper"
      : "Click “Add Shortcut” to finish setting up Focus Modes",
  );

  // Even "Replace" adds the new helper as another copy with the same name, so instead of looking
  // for it, keep retrying the request until some copy handles it, which also means it's done.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const id = await runHelper(input);
    if (id) {
      await LocalStorage.setItem(HELPER_ID_KEY, id);
      return true;
    }
  }
  return false;
}

export async function showFocusError(error: unknown, title: string) {
  await showFailureToast(error, {
    title,
    primaryAction:
      error instanceof FullDiskAccessError
        ? { title: "Open Privacy Settings", onAction: () => open(FULL_DISK_ACCESS_SETTINGS) }
        : undefined,
  });
}

async function switchFocus(input: string, getModes: () => Promise<FocusMode[]>, progress: string, done: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: progress });
  try {
    if (await runHelperWithSetup(input, getModes)) {
      await showHUD(done);
    } else {
      await showHUD("Focus Modes setup isn’t finished yet. Add the shortcut, then try again.");
    }
  } catch (error) {
    await toast.hide();
    await showFocusError(error, "Couldn’t change Focus");
  }
}

export async function turnOnFocus(mode: FocusMode, modes: FocusMode[]) {
  await switchFocus(mode.id, async () => modes, `Turning on ${mode.name}…`, `${mode.name} is on`);
}

export async function turnOffFocus() {
  let state: FocusState | undefined;
  try {
    state = await getFocusState();
  } catch {
    // Without Full Disk Access the active mode is unknown, but the helper can still turn every mode off.
  }
  // Naming the active mode lets an outdated helper report a mode it doesn't know, so it gets updated.
  const input = state?.activeId ? `off:${state.activeId}` : "off";
  const getModes = async () => state?.modes ?? (await getFocusState()).modes;
  await switchFocus(input, getModes, "Turning off Focus…", "Focus is off");
}
