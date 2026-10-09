import { environment, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { FocusMode, FocusState, FullDiskAccessError, getFocusState } from "./focus-state";
import { listHelperShortcutIds, runShortcut, writeSignedHelperShortcut } from "./helper-shortcut";

export const FULL_DISK_ACCESS_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
export const FOCUS_SETTINGS = "x-apple.systempreferences:com.apple.Focus-Settings.extension";

const HELPER_ID_KEY = "helper-shortcut-id";

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
