import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Tab } from "../types";
import { getTitle, getUrlDomain } from "../utils";
import CloseTabAction from "src/components/CloseTabAction";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import OpenTabAction from "./OpenTabAction";

const Actions = (props: {
  tab: Tab;
  refresh: () => void;
  closeLaunchers?: boolean;
  onActivate?: (tab: Tab) => void;
}) => (
  <ActionPanel>
    <ActionPanel.Section>
      <OpenTabAction tab={props.tab} closeLaunchers={props.closeLaunchers} onActivate={props.onActivate} />
      <Action.OpenInBrowser title="Open in Default Browser" url={props.tab.url} />
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
      <CloseTabAction tab={props.tab} refresh={props.refresh} />
      <Action
        title="Refresh Open Tabs"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => props.refresh()}
      />
    </ActionPanel.Section>
  </ActionPanel>
);

const TabListItem = (props: {
  tab: Tab;
  refresh: () => void;
  closeLaunchers?: boolean;
  id?: string;
  onActivate?: (tab: Tab) => void;
}) => {
  const url = props.tab.url;
  const accessories: List.Item.Accessory[] = [
    {
      text: getUrlDomain(url),
      tooltip: props.tab.url,
    },
  ];

  if (props.tab.is_current) {
    accessories.push({ text: "Current Tab", tooltip: "Currently active in Orion" });
  }

  return (
    <List.Item
      id={props.id}
      title={getTitle(props.tab)}
      icon={getFavicon(props.tab.url)}
      actions={
        <Actions
          tab={props.tab}
          refresh={props.refresh}
          closeLaunchers={props.closeLaunchers}
          onActivate={props.onActivate}
        />
      }
      accessories={accessories}
    />
  );
};

export default TabListItem;
