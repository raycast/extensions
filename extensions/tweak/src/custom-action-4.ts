import {
  getPreferenceValues,
  showHUD,
  closeMainWindow,
  updateCommandMetadata,
} from "@raycast/api";
import { runPolish } from "./runner";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences.CustomAction4>();

  if (!prefs.customPrompt?.trim()) {
    await closeMainWindow();
    await showHUD(
      "❌ No prompt set — configure it in Raycast Settings → Extensions → Tweak → Custom Action 4",
    );
    return;
  }

  const label = prefs.actionTitle?.trim() || "Custom Action 4";

  // Dynamically update the command's subtitle to match the label
  await updateCommandMetadata({ subtitle: label });

  await runPolish(prefs.customPrompt.trim(), label);
}
