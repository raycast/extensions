import { Action, ActionPanel, Icon } from "@raycast/api";
import { BibleReference } from "./types";
import { copyContentToClipboard } from "./utilities";

function ReferenceActions({ searchResult }: { searchResult: BibleReference }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="View on YouVersion" url={searchResult.url} />
      <Action
        title="Copy content to clipboard"
        onAction={() => {
          copyContentToClipboard(searchResult);
        }}
        icon={Icon.Clipboard}
      />
    </ActionPanel>
  );
}

export default ReferenceActions;
