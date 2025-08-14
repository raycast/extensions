import { Clipboard, Detail, PopToRootType, closeMainWindow, getPreferenceValues, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import IssueDetail from "./components/IssueDetail";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

const issueKeyRegex = /^\w{2,}-\d+$/gm;
function isValidIssueKey(input: string): boolean {
  return issueKeyRegex.test(input);
}

function getBaseURL() {
  const { baseUrl: preferencesBaseUrl } = getPreferenceValues<Preferences.OpenFromClipboard>();

  if (preferencesBaseUrl && preferencesBaseUrl.length > 0) {
    return preferencesBaseUrl.replace(/\/$/, "");
  }
}

const OpenIssue = ({ issueKey }: { issueKey: string }) => <IssueDetail issueKey={issueKey} />;

function OpenFromClipboard() {
  const [issueKey, setIssueKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function getClipboardText() {
      const { open_in } = getPreferenceValues<Preferences>();
      const clipboardText = (await Clipboard.readText())?.trim();
      if (!clipboardText || clipboardText.length == 0) {
        await showHUD("Clipboard empty", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        return;
      }

      if (!isValidIssueKey(clipboardText)) {
        await showHUD("Clipboard Content is not a valid Jira Issue Key", {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
        return;
      }

      // If we got a base URL configured, open the issue in the browser and close raycast
      const baseUrl = getBaseURL();
      if (baseUrl) {
        await open(getBaseURL() + "/browse/" + clipboardText, open_in ?? undefined);
        await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        return;
      }

      // If not, open the issue in raycast
      setIssueKey(clipboardText);
    }
    getClipboardText();
  }, []);

  if (!issueKey) {
    return <Detail isLoading />;
  }

  return <OpenIssue issueKey={issueKey} />;
}
export default withJiraCredentials(OpenFromClipboard);
