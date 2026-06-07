import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import {
  QuickTranscriptMode,
  getLatestHistoryRow,
  hasTranscript,
  modeLabel,
  noTranscriptTitle,
  quickModeLabel,
} from "./lib/typeless";

type QuickPreferences = {
  quickMode?: QuickTranscriptMode;
};

export default async function Command() {
  const preferences = getPreferenceValues<QuickPreferences>();
  const mode = preferences.quickMode ?? "latest";

  try {
    const row = await getLatestHistoryRow(mode);
    if (!row) {
      await showHUD(`No ${quickModeLabel(mode).toLowerCase()} found`);
      return;
    }

    if (!hasTranscript(row)) {
      await showHUD(noTranscriptTitle(row));
      return;
    }

    await Clipboard.copy(row.transcript);
    await showHUD(`Copied ${modeLabel(row)}`);
  } catch (error) {
    console.error(error);
    await showHUD("Typeless action failed");
  }
}
