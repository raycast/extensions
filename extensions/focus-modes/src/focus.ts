import { environment, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { FocusMode, FocusState, FullDiskAccessError, getFocusState, waitForActiveFocus } from "./focus-state";
import { listHelperShortcutIds, runShortcut, trustedHelperIds, writeSignedHelperShortcut } from "./helper-shortcut";

export const FULL_DISK_ACCESS_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
export const FOCUS_SETTINGS = "x-apple.systempreferences:com.apple.Focus-Settings.extension";

const TRUSTED_HELPERS_KEY = "trusted-helper-ids";

/** Identifiers of the helper copies this extension added, oldest first. */
async function getTrustedHelpers(): Promise<string[]> {
  return JSON.parse((await LocalStorage.getItem<string>(TRUSTED_HELPERS_KEY)) ?? "[]");
}

async function trustHelpers(ids: string[]) {
  const trusted = (await getTrustedHelpers()).filter((id) => !ids.includes(id));
  await LocalStorage.setItem(TRUSTED_HELPERS_KEY, JSON.stringify([...trusted, ...ids]));
}

/**
 * Runs the newest helper copy that can handle `input`. Returns false when no trusted copy is
 * installed or every copy was built before the requested mode existed.
 */
async function runHelper(input: string): Promise<boolean> {
  for (const id of trustedHelperIds(await listHelperShortcutIds(), await getTrustedHelpers())) {
    if ((await runShortcut(id, input)) === "ok") return true;
  }
  return false;
}

/** Runs the helper, first installing or updating it if it can't handle `input` yet. */
async function runHelperWithSetup(input: string, modes: FocusMode[]): Promise<boolean> {
  if (await runHelper(input)) return true;

  const installed = await listHelperShortcutIds();
  const trusted = await getTrustedHelpers();
  const file = await writeSignedHelperShortcut(modes, environment.supportPath);
  await open(file, "com.apple.shortcuts");
  if (installed.length === 0) {
    await showHUD("Click “Add Shortcut” to finish setting up Focus Modes");
  } else if (installed.every((id) => trusted.includes(id))) {
    await showHUD("Click “Add Shortcut”, then “Replace” to update the Focus helper");
  } else {
    // Another shortcut already has the helper's name; "Keep Both" leaves it untouched.
    await showHUD("Click “Add Shortcut”, then “Keep Both” to add the Focus helper");
  }

  // Only a shortcut that appears after opening the generated file is trusted as the helper.
  const before = new Set(installed);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const added = (await listHelperShortcutIds()).filter((id) => !before.has(id));
    if (added.length > 0) await trustHelpers(added);
    if (await runHelper(input)) return true;
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
