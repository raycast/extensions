// Output layer: attempts to paste the result into the editable area of the frontmost app.
// Uses a resilient paste-and-verify strategy to determine if an area is editable.
import { Clipboard } from "@raycast/api";
import { runAppleScript } from "./appleScript";
import { logger } from "./logger";
import { createAbortError, isAbortLikeError } from "./requestErrors";

export type OutputMethod = "pasted" | "not_editable";

const PASTE_DELAY_MS = 100;
const POST_FOCUS_WAIT_MS = 150;
const PANEL_POST_FOCUS_WAIT_MS = 20;
const PASTE_VERIFY_DELAY_MS = 300;
const MARKER_REGISTRATION_DELAY_MS = 100;
const COPY_COMPLETION_DELAY_MS = 200;
const FOCUS_WAIT_TIMEOUT_MS = 1500;
const FOCUS_POLL_INTERVAL_MS = 60;
const FRONTMOST_APP_SCRIPT =
  'tell application "System Events" to get name of first application process whose frontmost is true';
const COPY_SCRIPT = `
set volSettings to get volume settings
set origAlert to alert volume of volSettings
set volume alert volume 0
tell application "System Events" to keystroke "c" using {command down}
delay 0.1
set volume alert volume origAlert
`;
const VERIFY_MARKER = "__INFLOW_PASTE_VERIFY__";

/**
 * Attempts to paste text into the focused element of the frontmost app.
 * @param text - The text to be pasted
 * @param input - Original input text (used for comparison)
 * @returns "pasted" if paste succeeded; "not_editable" if the area is not editable.
 */
export async function outputResult(text: string, input?: string, signal?: AbortSignal): Promise<OutputMethod> {
  throwIfAborted(signal);

  logger.logStatus("outputResult", `Start. Preview: "${text.substring(0, 30).replace(/\n/g, " ")}..."`);

  if (input && text.trim() === input.trim()) {
    logger.warn("[outputResult] CAUTION: AI result is identical to original input!");
  }

  await delay(PASTE_DELAY_MS, signal);

  await waitForFrontmostNonRaycast(signal);
  await delay(POST_FOCUS_WAIT_MS, signal);
  throwIfAborted(signal);

  const frontmostApp = await getFrontmostAppName();
  logger.logStatus("outputResult", `Frontmost app: ${frontmostApp}`);

  logger.logStatus("outputResult", "Attempting paste and verify...");
  return await performPasteAndVerify(text, input, signal);
}

/**
 * Fast paste path for panel mode. It skips editability verification because
 * the user explicitly chose to paste the generated result back into the app.
 */
export async function pasteToFrontmostApp(text: string): Promise<void> {
  logger.logStatus("pasteToFrontmostApp", "Waiting for Raycast to lose focus...");
  await waitForFrontmostNonRaycast();
  await delay(PANEL_POST_FOCUS_WAIT_MS);
  await Clipboard.paste(text);
}

/**
 * Paste and verify: universally robust editability detection.
 */
async function performPasteAndVerify(text: string, input?: string, signal?: AbortSignal): Promise<OutputMethod> {
  try {
    throwIfAborted(signal);
    // 1. Use Raycast native paste which is much more stable across apps (e.g., WeChat, Browsers)
    // than raw AppleScript keystrokes.
    await Clipboard.paste(text);
    await delay(PASTE_VERIFY_DELAY_MS, signal);

    const clipboardText = await readClipboardAfterCopy(signal);

    // Explicitly check if the original input is still in the clipboard.
    // if Cmd+C successfully copied the original selection, it means the area was NOT editable.
    if (input && clipboardText === input.trim()) {
      logger.logStatus("performPasteAndVerify", "Original selection still present. Paste failed.");
      return "not_editable";
    }

    // If Cmd+C copied nothing, the selection was successfully removed (paste succeeded).
    // Some apps leave the MARKER intact, others clear the clipboard to "".
    // If the paste failed, the original selection would still be there, and Cmd+C would copy it.
    const selectionConsumed = clipboardText === VERIFY_MARKER || clipboardText === "";

    logger.logStatus(
      "performPasteAndVerify",
      `Clipboard after Cmd+C: "${clipboardText.substring(0, 40).replace(/\n/g, " ")}"`,
    );
    logger.logStatus("performPasteAndVerify", `Selection consumed: ${selectionConsumed}`);

    if (selectionConsumed) {
      logger.logStatus("performPasteAndVerify", "Paste verified successful!");
      // Put the result back on the clipboard for convenience
      throwIfAborted(signal);
      await Clipboard.copy(text);
      return "pasted";
    } else {
      logger.logStatus(
        "performPasteAndVerify",
        "Paste had no effect (selection still exists), returning not_editable.",
      );
      return "not_editable";
    }
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw error;
    }
    logger.error("[performPasteAndVerify] Error:", error);
    return "not_editable";
  }
}

async function readClipboardAfterCopy(signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  await Clipboard.copy(VERIFY_MARKER);
  await delay(MARKER_REGISTRATION_DELAY_MS, signal);
  throwIfAborted(signal);
  await runAppleScript(COPY_SCRIPT);
  await delay(COPY_COMPLETION_DELAY_MS, signal);
  throwIfAborted(signal);
  const afterCopy = await Clipboard.read();
  return (afterCopy.text || "").trim();
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitForFrontmostNonRaycast(signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + FOCUS_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    throwIfAborted(signal);
    const frontmost = await getFrontmostAppName();
    if (frontmost && frontmost !== "Raycast") return;
    await delay(FOCUS_POLL_INTERVAL_MS, signal);
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

async function getFrontmostAppName(): Promise<string | null> {
  try {
    const name = (await runAppleScript(FRONTMOST_APP_SCRIPT)).trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}
