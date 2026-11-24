import {
  Clipboard,
  PopToRootType,
  closeMainWindow,
  getFrontmostApplication,
  open,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { FillDriver, FillRequest, TargetAppError, notInFrontHud, runFill } from "./fill-sequence";
import {
  FRONTMOST_APP_SCRIPT,
  FrontmostApp,
  NOT_FRONTMOST_ERROR,
  PERMISSION_SETTINGS_URLS,
  frontmostNameFromError,
  isBundleId,
  keyPressScript,
  parseFrontmostApp,
} from "./key-press";

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

/** The app to fill: the one Raycast was opened from. */
export interface TargetApp {
  name: string;
  bundleId: string;
}

/**
 * Captures the external app before loading any item or code. Raycast stays open meanwhile, so that its toast shows
 * the loading, and closes once there's something to fill. Never guess a target after focus changes; keep checking
 * this same app while filling.
 */
export async function getTargetApp(): Promise<TargetApp> {
  const app = await getFrontmostApplication().catch(() => undefined);
  if (!app || !isBundleId(app.bundleId) || /^com\.raycast\./i.test(app.bundleId)) {
    throw new TargetAppError("Couldn't find the app to fill");
  }
  return { name: app.name, bundleId: app.bundleId };
}

/** Stops filling, naming the app in front instead of the target: that's the one the user can't guess. */
function notInFront(target: TargetApp, frontmostName: string | undefined): TargetAppError {
  return new TargetAppError(notInFrontHud(frontmostName, target.name));
}

async function getFrontmostApp(): Promise<FrontmostApp> {
  return parseFrontmostApp(await runAppleScript(FRONTMOST_APP_SCRIPT));
}

/** Fills the target app, and only that app: every key press checks that it's in front. */
function createRaycastDriver(target: TargetApp): FillDriver {
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
      try {
        await runAppleScript(keyPressScript(keyCode, modifiers, target.bundleId));
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes(NOT_FRONTMOST_ERROR)) {
          throw notInFront(target, frontmostNameFromError(error.message));
        }
        throw error;
      }
    },
    async returnToPreviousApp() {
      // Keep the command running while filling; finish() goes back to the root search.
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
      await wait(FOCUS_DELAY_MS);
      // The app can take a moment to get the focus back. Never paste anywhere else in the meantime.
      const deadline = Date.now() + FOCUS_TIMEOUT_MS;
      for (;;) {
        const frontmost = await getFrontmostApp();
        if (frontmost.bundleId.toLowerCase() === target.bundleId.toLowerCase()) return;
        // Name the last app seen in front.
        if (Date.now() >= deadline) throw notInFront(target, frontmost.name);
        await wait(FOCUS_POLL_MS);
      }
    },
    wait,
    openPermissionSettings: (permission) => open(PERMISSION_SETTINGS_URLS[permission]),
    showHud: (message) => showHUD(message),
    logError: (error) => console.error("Couldn't fill:", error),
    finish: () => popToRoot({ clearSearchBar: true }),
  };
}

/** Closes Raycast and pastes values into the target app, from getTargetApp(); see runFill(). */
export function fillApp(target: TargetApp, request: FillRequest): Promise<void> {
  return runFill(createRaycastDriver(target), request);
}
