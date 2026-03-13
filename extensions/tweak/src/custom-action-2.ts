import {
  getPreferenceValues,
  showHUD,
  closeMainWindow,
  updateCommandMetadata,
} from "@raycast/api";
import { runPolish } from "./runner";

interface CustomPrefs {
  actionTitle?: string;
  customPrompt?: string;
}

export default async function Command() {
  const prefs = getPreferenceValues<CustomPrefs>();

  if (!prefs.customPrompt?.trim()) {
    await closeMainWindow();
    await showHUD(
      "❌ No prompt set — configure it in Raycast Settings → Extensions → Tweak → Custom Action 2",
    );
    return;
  }

  const label = prefs.actionTitle?.trim() || "Custom Action 2";

  // Dynamically update the command's subtitle to match the label
  await updateCommandMetadata({ subtitle: label });

  await runPolish(prefs.customPrompt.trim(), label);
}
