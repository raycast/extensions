import { Clipboard, getFrontmostApplication, showHUD, showToast, Toast } from "@raycast/api";
import { setTimeout as delay } from "node:timers/promises";
import type { AiCommand } from "../lib/commands/types";
import type { RunInput } from "../lib/launch-context";
import { finalizeReplacement } from "../lib/output";
import { isSameTarget, replaceFailureMessage, type AppIdentity } from "../lib/replace";
import { restoreClipboard } from "./clipboard";
import { isSetupError, toFmError } from "./errors";
import { invalidatePreflight } from "./preflight";
import { executeRun } from "./run";

export const CLIPBOARD_RESTORE_DELAY_MS = 300;

export async function pasteAndRestoreClipboard(text: string): Promise<void> {
  const previous = await Clipboard.read();
  try {
    await Clipboard.paste(text);
    await delay(CLIPBOARD_RESTORE_DELAY_MS);
  } finally {
    await restoreClipboard(previous);
  }
}

async function frontmostApp(): Promise<AppIdentity | undefined> {
  try {
    return await getFrontmostApplication();
  } catch {
    return undefined;
  }
}

export async function replaceSelection(
  command: AiCommand,
  input: RunInput,
  argumentValues: Record<string, string>,
): Promise<void> {
  const progress = await showToast({ style: Toast.Style.Animated, title: `Running ${command.name}` });
  const targetApp = input.source === "selection" ? await frontmostApp() : undefined;
  try {
    const output = await executeRun({ command, input, argumentValues, stream: false });
    const result = finalizeReplacement(output, input.text);
    await progress.hide();
    if (!result.ok) return await showHUD(replaceFailureMessage(result));

    const currentApp = input.source === "selection" ? await frontmostApp() : undefined;
    if (input.source === "selection" && !isSameTarget(targetApp, currentApp)) {
      await Clipboard.copy(result.text);
      await showHUD(
        targetApp && currentApp
          ? "Focus changed. Result copied to the clipboard."
          : "Couldn't confirm the target app. Result copied to the clipboard.",
      );
    } else if (input.source === "selection") {
      await pasteAndRestoreClipboard(result.text);
      await showHUD(`Replaced with ${command.name}`);
    } else {
      await Clipboard.copy(result.text);
      await showHUD("No text was selected. Result copied to the clipboard.");
    }
  } catch (error) {
    await progress.hide();
    const fmError = toFmError(error);
    if (isSetupError(fmError)) invalidatePreflight();
    await showHUD(fmError.message);
  }
}
