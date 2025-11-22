import { Action, ActionPanel, Icon } from "@raycast/api";
import { BibleReference } from "./types";
import { copyContentToClipboard } from "./utilities";

function ReferenceActions({ searchResult }: { searchResult: BibleReference }) {
  return (
    <ActionPanel>
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      <Action.OpenInBrowser title="View on YouVersion" url={searchResult.url} />
      <Action
        title="Copy Content to Clipboard"
        onAction={() => {
          copyContentToClipboard(searchResult);
        }}
        icon={Icon.Clipboard}
      />
    </ActionPanel>
  );
}

export default ReferenceActions;
