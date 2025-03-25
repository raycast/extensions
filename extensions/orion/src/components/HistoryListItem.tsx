import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { HistoryItem } from "../types";
import { extractDomainName } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";

const Actions = (props: { entry: HistoryItem; searchText?: string }) => {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.entry.url} />
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
  return props.entry.title ? (
    <List.Item
      title={props.entry.title}
      icon={getFavicon(props.entry.url)}
      actions={<Actions entry={props.entry} searchText={props.searchText} />}
      accessories={[
        {
          text: extractDomainName(props.entry.url),
          tooltip: props.entry.url,
        },
      ]}
    />
  ) : null;
};

export default HistoryListItem;
