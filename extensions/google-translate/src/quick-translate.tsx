import { getPreferenceValues, getSelectedText, launchCommand, LaunchType } from "@raycast/api";
import { randomUUID } from "node:crypto";

export default async function QuickTranslate() {
  let text = "";
  if (getPreferenceValues<ExtensionPreferences>().autoInput) {
    try {
      text = await getSelectedText();
    } catch {
      // No selection is a valid launch: show an empty, editable translation view.
    }
  }

  await launchCommand({
    name: "quick-translate-view",
    type: LaunchType.UserInitiated,
    context: { text, requestId: randomUUID() },
  });
}
