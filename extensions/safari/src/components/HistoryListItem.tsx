import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { HistoryItem } from "../types";
import { getUrlDomain } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import SearchInBrowserAction from "./SearchInBrowserAction";

const Actions = (props: { entry: HistoryItem; searchText?: string }) => {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.entry.url} />
        <SearchInBrowserAction searchText={props.searchText} fallbackSearchType="search" />
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

export default function HistoryListItem(props: { entry: HistoryItem; searchText?: string }) {
  return props.entry.title ? (
    <List.Item
      title={props.entry.title}
      icon={getFavicon(props.entry.url)}
      actions={<Actions entry={props.entry} searchText={props.searchText} />}
      accessories={[
        {
          text: getUrlDomain(props.entry.url),
          tooltip: props.entry.url,
        },
      ]}
    />
  ) : null;
}
