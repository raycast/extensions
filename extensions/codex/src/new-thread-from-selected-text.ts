import { getPreferenceValues, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openNewCodexThread } from "./utils/launch";

export default async function Command() {
  let selectedText: string;
  try {
    selectedText = (await getSelectedText()).trim();
  } catch (error) {
    await showFailureToast(error, { title: "Failed" });
    return;
  }

  if (!selectedText) {
    await showHUD("No text selected");
    return;
  }

  const { selectedTextPromptPrefix } =
    getPreferenceValues<Preferences.NewThreadFromSelectedText>();
  const prefix = selectedTextPromptPrefix?.trim();
  const prompt = prefix ? `${prefix}\n\n${selectedText}` : selectedText;

  try {
    await openNewCodexThread({ prompt });
  } catch (error) {
    await showFailureToast(error, { title: "Unable to start Codex thread" });
  }
}
