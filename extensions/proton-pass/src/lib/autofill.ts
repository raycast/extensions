import { Clipboard, PopToRootType, closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { FillDriver, FillRequest, runFill } from "./fill-sequence";
import { keyPressScript } from "./key-press";

/** Minimum time for the previous app to get the focus back once Raycast closes. */
const FOCUS_DELAY_MS = 250;
/** How long to wait at most, on top of that, for Raycast to stop being the frontmost app. */
const FOCUS_TIMEOUT_MS = 1500;
const FOCUS_POLL_MS = 50;

/** Filling relies on AppleScript, so it is only offered on macOS. */
export const canFillFrontmostApp = process.platform === "darwin";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function frontmostAppName(): Promise<string> {
  return runAppleScript(
    'tell application "System Events" to get name of first application process whose frontmost is true',
  );
}

const raycastDriver: FillDriver = {
  readClipboard: () => Clipboard.read(),
  async restoreClipboard(previous) {
    if (previous.file) await Clipboard.copy({ file: previous.file });
    else if (previous.html) await Clipboard.copy({ html: previous.html, text: previous.text });
    else if (previous.text) await Clipboard.copy({ text: previous.text });
    else await Clipboard.clear();
  },
  copyConcealed: (value) => Clipboard.copy(value, { concealed: true }),
  async pressKey(keyCode, modifiers) {
    await runAppleScript(keyPressScript(keyCode, modifiers));
  },
  async returnToPreviousApp() {
    // Keep the command running while filling; finish() goes back to the root search.
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
    await wait(FOCUS_DELAY_MS);
    // Some apps take longer to get the focus back: don't paste while Raycast is still in front.
    const deadline = Date.now() + FOCUS_TIMEOUT_MS;
    while (Date.now() < deadline && (await frontmostAppName()) === "Raycast") await wait(FOCUS_POLL_MS);
  },
  wait,
  showHud: (message) => showHUD(message),
  finish: () => popToRoot({ clearSearchBar: true }),
};

/** Closes Raycast and pastes values into the app that was in front of it; see runFill(). */
export function fillFrontmostApp(request: FillRequest): Promise<void> {
  return runFill(raycastDriver, request);
}
