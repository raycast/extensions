import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import { HistoryItem } from "../types";
import { getFaviconUrl, getUrlDomain } from "../utils";
import SearchInBrowserAction from "./SearchInBrowserAction";

const Actions = (props: { entry: HistoryItem; searchText?: string }) => {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <OpenInBrowserAction url={props.entry.url} />
        <SearchInBrowserAction searchText={props.searchText} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.entry.title && (
          <CopyToClipboardAction
            title="Copy Title"
            content={props.entry.title}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
        <CopyToClipboardAction
          title="Copy URL"
          content={props.entry.url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <CopyToClipboardAction
          title="Copy Markdown"
          content={`[${props.entry.title}](${props.entry.url})`}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "." }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

const HistoryListItem = (props: { entry: HistoryItem; searchText?: string }) => {
  const domain = getUrlDomain(props.entry.url);

  return props.entry.title ? (
    <List.Item
      title={props.entry.title}
      icon={getFaviconUrl(domain)}
      accessoryTitle={domain}
      actions={<Actions entry={props.entry} searchText={props.searchText} />}
    />
  ) : null;
};

export default HistoryListItem;
