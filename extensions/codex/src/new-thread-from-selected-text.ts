import { getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openNewCodexThread } from "./utils/launch";
import { buildSelectedTextPrompt } from "./utils/selected-text-prompt";

export default async function Command() {
  let prompt: string;
  try {
    // Read the selection before opening Codex or changing application focus.
    prompt = (await getSelectedText()).trim();
  } catch (error) {
    await showFailureToast(error, {
      title: "No text selected or unable to read selection",
    });
    return;
  }

  if (!prompt) {
    await showHUD("No text selected");
    return;
  }

  try {
    const preferences = getPreferenceValues<Preferences>();
    prompt = buildSelectedTextPrompt(
      prompt,
      preferences.selectedTextPromptPrefix,
    );
    await openNewCodexThread({ prompt });
  } catch (error) {
    await showFailureToast(error, { title: "Unable to start Codex thread" });
  }
}
