import { Action, ActionPanel, Icon } from "@raycast/api";
import { SnippetFile } from "../../lib/types/snippet-file";
import { CONFIG } from "../../config";
import { SnippetWithLibrary } from "../../lib/utils/snippet-utils";

interface ItemActionsProps {
  file: SnippetFile;
  snippet: SnippetWithLibrary;
  toggleShowingDetail: () => void;
}

export function ItemActions({ file, snippet, toggleShowingDetail }: ItemActionsProps) {
  const openUrl = snippet.teamGuid
    ? `${CONFIG.appURL}/enter?action=goto_team_snippet&t=${snippet.teamGuid}&s=${snippet.guid}`
    : `${CONFIG.appURL}/enter?action=goto_snippet&s=${snippet.guid}`;

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy to Clipboard" content={file.content} />
      <Action.Paste content={file.content} />
      <Action
        title="Toggle Details"
        icon={Icon.List}
        shortcut={{ modifiers: [], key: "tab" }}
        onAction={toggleShowingDetail}
      />
      <Action.OpenInBrowser title="Open in Cacher" url={openUrl} icon={Icon.Code} />
      <Action.CreateSnippet title="Save as Raycast Snippet" snippet={{ name: snippet.title, text: file.content }} />
    </ActionPanel>
  );
}
