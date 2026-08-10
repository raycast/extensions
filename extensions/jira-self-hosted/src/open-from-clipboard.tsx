import { Clipboard, PopToRootType, closeMainWindow, getPreferenceValues, open, showHUD } from "@raycast/api";
import { useEffect } from "react";

import { getIssueUrlFromPreferences } from "./helpers/urls";

const issueKeyRegex = /^\w{2,}-\d+$/gm;
function isValidIssueKey(input: string): boolean {
  return issueKeyRegex.test(input);
}

export default function OpenFromClipboard() {
  useEffect(() => {
    async function go() {
      const clipboardText = (await Clipboard.readText())?.trim();
      if (!clipboardText) {
        await showHUD("Clipboard empty", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        return;
      }

      if (!isValidIssueKey(clipboardText)) {
        await showHUD("Clipboard content is not a valid Jira issue key", {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
        return;
      }

      const { open_in } = getPreferenceValues<Preferences>();
      await open(getIssueUrlFromPreferences(clipboardText), open_in ?? undefined);
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    }
    go();
  }, []);

  return null;
}
