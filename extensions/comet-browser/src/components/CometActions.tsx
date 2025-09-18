import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { closeActiveTab, setActiveTab, openNewTab } from "../actions";
import { Tab } from "../interfaces";

export class CometActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

function NewTabActions({
  query,
  url,
}: {
  query?: string;
  url?: string;
}): ReactElement {
  let actionTitle = "Open Empty Tab";
  if (query) {
    actionTitle = `Search "${query}"`;
  } else if (url) {
    actionTitle = `Open URL "${url}"`;
  }

  async function handleAction() {
    await openNewTab({ query, url });
  }

  return (
    <ActionPanel title="New Tab">
      <Action onAction={handleAction} title={actionTitle} />
    </ActionPanel>
  );
}

function TabListItemActions({
  tab,
  onTabClosed,
}: {
  tab: Tab;
  onTabClosed?: () => void;
}) {
  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
      <Action.CopyToClipboard
        title="Copy Title"
        content={tab.title}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
      <CloseTab tab={tab} onTabClosed={onTabClosed} />
      <ActionPanel.Section>
        <Action.CreateQuicklink
          quicklink={{ link: tab.url, name: tab.title, application: "Comet" }}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    try {
      await setActiveTab(props.tab);
      await closeMainWindow();
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(
          "Issue with tab: '" + props.tab.sourceLine + "'\n" + e.message,
        );
      } else {
        throw e;
      }
    }
  }

  return (
    <ActionPanel.Item
      title="Open Tab"
      icon={{ source: Icon.Eye }}
      onAction={handleAction}
    />
  );
}

function HistoryItemActions({
  title,
  url,
}: {
  title: string;
  url: string;
  profile: string;
}): ReactElement {
  return (
    <ActionPanel title={title}>
      <Action onAction={() => openNewTab({ url })} title={"Open"} />
      <Action.CopyToClipboard
        title="Copy URL"
        content={url}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
    </ActionPanel>
  );
}

function CloseTab(props: { tab: Tab; onTabClosed?: () => void }) {
  async function handleAction() {
    await closeActiveTab(props.tab);
    await closeMainWindow();
    props.onTabClosed?.();
  }

  return (
    <Action
      title="Close Tab"
      icon={{ source: Icon.XMarkCircle }}
      onAction={handleAction}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
    />
  );
}
