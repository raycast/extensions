import { getSelectedText, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { insertNode } from "./lib/api";
import { insertNodeOptimistically } from "./lib/cache";
import { getPreferences } from "./lib/preferences";

export default async function Command(props: { arguments: Arguments.AddToToday }) {
  const preferences = getPreferences();
  if (!preferences.apiKey) {
    await showToast({ style: Toast.Style.Failure, title: "Missing Workflowy API Key", message: "Open preferences to add it." });
    await openExtensionPreferences();
    return;
  }

  let text: string | undefined = props.arguments.text?.trim();
  if (!text) {
    try {
      text = (await getSelectedText()).trim();
    } catch {
      text = undefined;
    }
  }

  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Enter an item to add to Today" });
    return;
  }

  try {
    const result = await insertNode(preferences.apiKey, {
      target: "today",
      text,
      position: preferences.capturePosition,
      type: "todo",
    });

    if (result.id && result.parentId) {
      insertNodeOptimistically({
        id: result.id,
        name: text,
        note: null,
        parentId: result.parentId,
      });
    }

    await showHUD("Added to Today");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not add to Today",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
