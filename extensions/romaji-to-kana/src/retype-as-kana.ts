import { closeMainWindow, getSelectedText, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { checkWhitespace, findUntypableChars, RETYPE_SCRIPT } from "./lib/keys";

export default async function Command() {
  await closeMainWindow();

  let text = "";
  try {
    text = await getSelectedText();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/accessibility|permission|denied|authorized|not permitted/i.test(message)) {
      await showHUD("Accessibility permission required. Please check System Settings.");
    } else {
      await showHUD("Please select text");
    }
    return;
  }

  if (!text || text.length === 0) {
    await showHUD("Please select text");
    return;
  }

  const { hasNewlinesOrTabs, hasSpaces } = checkWhitespace(text);
  if (hasNewlinesOrTabs) {
    await showHUD("Text contains newlines or tabs, which are not supported");
    return;
  }
  if (hasSpaces) {
    await showHUD("Text contains spaces, which triggers IME conversion");
    return;
  }

  const untypable = findUntypableChars(text);
  if (untypable.length > 0) {
    await showHUD(`Text contains non-ASCII characters: ${untypable.slice(0, 5).join(" ")}`);
    return;
  }

  try {
    await runAppleScript(RETYPE_SCRIPT, [text]);
  } catch (error) {
    console.error(error);
    await showHUD("Failed to send keys. Please check Accessibility and System Events permissions.");
  }
}
