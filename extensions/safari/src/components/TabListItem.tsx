import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Tab } from "../types";
import { getTabUrl, getTitle, getUrlDomain } from "../utils";
import CloseLocalTabAction from "./CloseLocalTabAction";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import OpenTabAction from "./OpenTabAction";

const Actions = (props: { tab: Tab; refresh: () => void }) => (
  <ActionPanel>
    <ActionPanel.Section>
      <OpenTabAction tab={props.tab} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <CopyUrlAction url={props.tab.url} />
      <CopyTitleAction title={props.tab.title} />
      <CopyMarkdownLinkAction title={props.tab.title} url={props.tab.url} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.CreateQuicklink
        quicklink={{ link: props.tab.url, name: props.tab.title }}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <CloseLocalTabAction tab={props.tab} refresh={props.refresh} />
    </ActionPanel.Section>
  </ActionPanel>
);

export default function TabListItem(props: { tab: Tab; refresh: () => void }) {
  const url = getTabUrl(props.tab.url);

  return (
    <List.Item
      title={getTitle(props.tab)}
      icon={getFavicon(props.tab.url)}
      actions={<Actions tab={props.tab} refresh={props.refresh} />}
      accessories={[
        {
          text: getUrlDomain(url),
          tooltip: props.tab.url,
        },
      ]}
    />
  );
}
