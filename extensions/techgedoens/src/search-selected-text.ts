import { getSelectedText, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function SearchSelectedTextCommand() {
  let selectedText: string;

  try {
    selectedText = normalizeSelectedText(await getSelectedText());
    if (!selectedText) {
      throw new Error("Select text in another application and try again.");
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Read Selected Text" });
    return;
  }

  try {
    await launchCommand({
      name: "search-techgedoens",
      type: LaunchType.UserInitiated,
      context: { searchText: selectedText },
    });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Techgedöns Search" });
  }
}

function normalizeSelectedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
