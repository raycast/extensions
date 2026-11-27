import { Alert, confirmAlert, getPreferenceValues, showHUD } from "@raycast/api";
import { clearHistory } from "./lib/storage";
import type { Preferences } from "./lib/types";

export default async function Command() {
  const { confirmClear } = getPreferenceValues<Preferences>();
  if (confirmClear ?? true) {
    const ok = await confirmAlert({
      title: "Clear Clipboard History?",
      message: "This cannot be undone.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
  }
  clearHistory();
  await showHUD("Clipboard history cleared");
}
