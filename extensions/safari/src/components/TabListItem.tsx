import { Action, ActionPanel, List } from "@raycast/api";
import { Tab } from "../types";
import { getTitle, getFaviconUrl, getTabUrl, getUrlDomain } from "../utils";
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

const TabListItem = (props: { tab: Tab; refresh: () => void }) => {
  const url = getTabUrl(props.tab.url);
  const domain = getUrlDomain(url);

  return (
    <List.Item
      title={getTitle(props.tab)}
      icon={getFaviconUrl(domain)}
      actions={<Actions tab={props.tab} refresh={props.refresh} />}
      accessories={[
        {
          text: domain,
          tooltip: props.tab.url,
        },
      ]}
    />
  );
};

export default TabListItem;
