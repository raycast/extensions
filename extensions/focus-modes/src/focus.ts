import { environment, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { rm } from "fs/promises";
import { join } from "path";
import { showFailureToast } from "@raycast/utils";
import { FocusMode, FocusState, FullDiskAccessError, getFocusState, waitForActiveFocus } from "./focus-state";
import {
  listShortcuts,
  newHelperName,
  runShortcut,
  trustedHelperIds,
  writeSignedHelperShortcut,
} from "./helper-shortcut";

export const FULL_DISK_ACCESS_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
export const FOCUS_SETTINGS = "x-apple.systempreferences:com.apple.Focus-Settings.extension";

const TRUSTED_HELPERS_KEY = "trusted-helper-ids";

/** Identifiers of the helper copies this extension added, oldest first. */
async function getTrustedHelpers(): Promise<string[]> {
  return JSON.parse((await LocalStorage.getItem<string>(TRUSTED_HELPERS_KEY)) ?? "[]");
}

async function trustHelper(id: string, installed: string[]) {
  const trusted = (await getTrustedHelpers()).filter((trustedId) => installed.includes(trustedId));
  await LocalStorage.setItem(TRUSTED_HELPERS_KEY, JSON.stringify([...trusted, id]));
}

/**
 * Runs the newest helper copy that can handle `input`. Returns false when no trusted copy is
 * installed or every copy was built before the requested mode existed.
 */
async function runHelper(input: string): Promise<boolean> {
  const installed = (await listShortcuts()).map((shortcut) => shortcut.id);
  for (const id of trustedHelperIds(installed, await getTrustedHelpers())) {
    if ((await runShortcut(id, input)) === "ok") return true;
  }
  return false;
}

/** Runs the helper, first installing or updating it if it can't handle `input` yet. */
async function runHelperWithSetup(input: string, modes: FocusMode[]): Promise<boolean> {
  if (await runHelper(input)) return true;

  const before = new Set((await listShortcuts()).map((shortcut) => shortcut.id));
  const isUpdate = trustedHelperIds([...before], await getTrustedHelpers()).length > 0;
  const name = newHelperName();
  // Named after the helper, so overlapping setups never share files.
  const directory = join(environment.supportPath, "helpers", name);
  try {
    const file = await writeSignedHelperShortcut(modes, directory, name);
    await open(file, "com.apple.shortcuts");
    await showHUD(
      isUpdate
        ? "Click “Add Shortcut” to update the Focus helper"
        : "Click “Add Shortcut” to finish setting up Focus Modes",
    );

    // The helper is the shortcut that appears with the generated name after its file was opened.
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const installed = await listShortcuts();
      const helper = installed.find((shortcut) => shortcut.name === name && !before.has(shortcut.id));
      if (helper) {
        await trustHelper(
          helper.id,
          installed.map((shortcut) => shortcut.id),
        );
        return runHelper(input);
      }
    }
    return false;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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

/** Runs `input` through the helper and reports success only once the Focus database shows `expectedActiveId`. */
async function switchFocus(
  input: string,
  expectedActiveId: string | undefined,
  modes: FocusMode[],
  progress: string,
  done: string,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: progress });
  try {
    if (!(await runHelperWithSetup(input, modes))) {
      await showHUD("Focus Modes setup isn’t finished yet. Add the shortcut, then try again.");
    } else if (await waitForActiveFocus(expectedActiveId, 5_000)) {
      await showHUD(done);
    } else {
      await showHUD("Focus didn’t change. Try again, or check Focus in Control Center.");
    }
  } catch (error) {
    await toast.hide();
    await showFocusError(error, "Couldn’t change Focus");
  }
}

export async function turnOnFocus(mode: FocusMode, modes: FocusMode[]) {
  await switchFocus(mode.id, mode.id, modes, `Turning on ${mode.name}…`, `${mode.name} is on`);
}

export async function turnOffFocus() {
  let state: FocusState;
  try {
    state = await getFocusState();
  } catch (error) {
    await showFocusError(error, "Couldn’t turn off Focus");
    return;
  }
  if (!state.activeId) {
    await showHUD("No Focus is on");
    return;
  }
  // Naming the active mode lets an outdated helper report a mode it doesn't know, so it gets updated.
  await switchFocus(`off:${state.activeId}`, undefined, state.modes, "Turning off Focus…", "Focus is off");
}
