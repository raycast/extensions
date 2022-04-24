import { ActionPanel, List, Action } from "@raycast/api";
import { HistoryItem } from "../types";
import { getFaviconUrl, getUrlDomain } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import SearchInBrowserAction from "./SearchInBrowserAction";

const Actions = (props: { entry: HistoryItem; searchText?: string }) => {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.entry.url} />
        <SearchInBrowserAction searchText={props.searchText} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <CopyUrlAction url={props.entry.url} />
        <CopyTitleAction title={props.entry.title} />
        <CopyMarkdownLinkAction title={props.entry.title} url={props.entry.url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CreateQuicklink
          quicklink={{ link: props.entry.url, name: props.entry.title }}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
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
      actions={<Actions entry={props.entry} searchText={props.searchText} />}
      accessories={[
        {
          text: domain,
          tooltip: props.entry.url,
        },
      ]}
    />
  ) : null;
};

export default HistoryListItem;
