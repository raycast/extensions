import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { convert, detectDirection, LayoutId } from "./layout";

// Abbreviations exactly as macOS labels these input sources in the menu bar,
// so the HUD matches the system and can't be called "wrong".
const LAYOUT_ABBR: Record<LayoutId, string> = {
  russian: "РУ",
  ukrainian: "УК",
  belarusian: "БЕ",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class AutomationDeniedError extends Error {}

/**
 * Simulate Cmd+A in the frontmost app to select the whole field. This goes
 * through System Events, which needs the "Automation" permission (separate
 * from Accessibility). If that's missing the keystroke throws — we surface
 * it as a clear, actionable error.
 */
async function selectAll(): Promise<void> {
  try {
    await runAppleScript(
      'tell application "System Events" to keystroke "a" using command down',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // -1743 / "Not authorized" => the Automation permission was denied.
    if (/-1743|not authoriz|assistive|accessibilit/i.test(message)) {
      throw new AutomationDeniedError(message);
    }
    throw error;
  }
  // Give the focused app time to update its selection before we read it.
  await sleep(200);
}

async function readSelection(): Promise<string> {
  try {
    // Return the selection as-is (don't trim): a whitespace-only selection is
    // still a real selection, and must NOT fall through to the Cmd+A path that
    // would grab and overwrite the whole field.
    return await getSelectedText();
  } catch {
    return "";
  }
}

/**
 * Collapse the current selection by pressing → (Right Arrow). Used after a
 * whole-field Cmd+A when there's nothing to paste, so the field isn't left
 * fully selected — otherwise the next keystroke would overwrite all of it.
 */
async function collapseSelection(): Promise<void> {
  try {
    await runAppleScript('tell application "System Events" to key code 124');
  } catch {
    // Best-effort; if Automation is unavailable, just leave the selection.
  }
}

export default async function Command(): Promise<void> {
  // Make sure Raycast's window is gone and focus is back on the target app
  // before we read the selection or send keystrokes to it.
  await closeMainWindow();
  await sleep(120);

  // 1. Use the current selection if there is one...
  let text = await readSelection();

  // 2. ...otherwise grab the whole field with Cmd+A.
  let selectedWholeField = false;
  if (!text) {
    try {
      await selectAll();
    } catch (error) {
      if (error instanceof AutomationDeniedError) {
        await showHUD(
          "⚠️ Allow Raycast → System Events in Settings ▸ Privacy ▸ Automation",
        );
        return;
      }
      throw error;
    }
    selectedWholeField = true;
    text = await readSelection();
  }

  if (!text) {
    await showHUD(
      "⌨️ Nothing to convert — select some text or focus a text field",
    );
    return;
  }

  const { layout } = getPreferenceValues<{ layout: LayoutId }>();
  const direction = detectDirection(text);
  const converted = convert(text, layout, direction);

  if (converted === text) {
    // If we selected the whole field ourselves, don't leave it highlighted —
    // collapse the selection so the next keystroke can't wipe the field.
    if (selectedWholeField) await collapseSelection();
    await showHUD("⌨️ Nothing changed — no layout-specific characters found");
    return;
  }

  // Paste over the (still-selected) text, replacing it.
  await Clipboard.paste(converted);

  const lang = LAYOUT_ABBR[layout];
  const label = direction === "cyr-to-en" ? `${lang} → EN` : `EN → ${lang}`;
  await showHUD(`✅ Converted layout (${label})`);
}
