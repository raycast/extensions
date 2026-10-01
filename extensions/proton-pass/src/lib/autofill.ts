import { Clipboard, PopToRootType, closeMainWindow, getFrontmostApplication, popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { FillDriver, FillRequest, TargetAppError, runFill } from "./fill-sequence";
import { FRONTMOST_BUNDLE_ID_SCRIPT, NOT_FRONTMOST_ERROR, isBundleId, keyPressScript } from "./key-press";

/** Minimum time for the previous app to get the focus back once Raycast closes. */
const FOCUS_DELAY_MS = 250;
/** How long to wait at most, on top of that, for that app to be in front. */
const FOCUS_TIMEOUT_MS = 1500;
const FOCUS_POLL_MS = 50;

/** Filling relies on AppleScript, so it is only offered on macOS. */
export const canFillFrontmostApp = process.platform === "darwin";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TargetApp {
  name: string;
  bundleId: string;
}

function notInFront(app: TargetApp): TargetAppError {
  return new TargetAppError(`Stopped filling: ${app.name} isn't in front`);
}

async function isInFront(app: TargetApp): Promise<boolean> {
  const bundleId = await runAppleScript(FRONTMOST_BUNDLE_ID_SCRIPT);
  return bundleId.toLowerCase() === app.bundleId.toLowerCase();
}

/** Fills the app Raycast was opened from, and only that app: every key press checks that it's in front. */
function createRaycastDriver(): FillDriver {
  let target: TargetApp | undefined;

  return {
    readClipboard: () => Clipboard.read(),
    async restoreClipboard(previous) {
      // Concealed too: the previous clipboard can itself be a secret, such as a password copied earlier.
      const options = { concealed: true };
      if (previous.file) await Clipboard.copy({ file: previous.file }, options);
      else if (previous.html) await Clipboard.copy({ html: previous.html, text: previous.text }, options);
      else if (previous.text) await Clipboard.copy({ text: previous.text }, options);
      else await Clipboard.clear();
    },
    copyConcealed: (value) => Clipboard.copy(value, { concealed: true }),
    async pressKey(keyCode, modifiers = []) {
      if (!target) throw new TargetAppError("Couldn't find the app to fill");
      try {
        await runAppleScript(keyPressScript(keyCode, modifiers, target.bundleId));
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes(NOT_FRONTMOST_ERROR)) throw notInFront(target);
        throw error;
      }
    },
    async returnToPreviousApp() {
      // The frontmost app is the one Raycast was opened from, i.e. the app to fill.
      const app = await getFrontmostApplication().catch(() => undefined);
      if (!app || !isBundleId(app.bundleId)) throw new TargetAppError("Couldn't find the app to fill");
      target = { name: app.name, bundleId: app.bundleId };

      // Keep the command running while filling; finish() goes back to the root search.
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
      await wait(FOCUS_DELAY_MS);
      // The app can take a moment to get the focus back. Never paste anywhere else in the meantime.
      const deadline = Date.now() + FOCUS_TIMEOUT_MS;
      while (!(await isInFront(target))) {
        if (Date.now() >= deadline) throw notInFront(target);
        await wait(FOCUS_POLL_MS);
      }
    },
    wait,
    showHud: (message) => showHUD(message),
    logError: (error) => console.error("Couldn't fill:", error),
    finish: () => popToRoot({ clearSearchBar: true }),
  };
}

/** Closes Raycast and pastes values into the app that was in front of it; see runFill(). */
export function fillFrontmostApp(request: FillRequest): Promise<void> {
  return runFill(createRaycastDriver(), request);
}
