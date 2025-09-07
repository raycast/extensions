import { ReactElement } from "react";
import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { openNewHistoryTab, openNewTab, setActiveTab } from "../actions";
import { Tab } from "../interfaces";

export class OperaActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

function NewTabActions({ query }: { query?: string }): ReactElement {
  return (
    <ActionPanel title="New Tab">
      <Action
        onAction={function () {
          openNewTab(query);
        }}
        title={query ? `Search "${query}"` : "Open Empty Tab"}
      />
    </ActionPanel>
  );
}

function TabListItemActions({ tab }: { tab: Tab }) {
  return (
    <ActionPanel title={tab.title}>
      <GoToTab tab={tab} />
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
    </ActionPanel>
  );
}

function HistoryItemActions({ title, url }: { title: string; url: string }): ReactElement {
  return (
    <ActionPanel title={title}>
      <Action
        onAction={function () {
          openNewHistoryTab(url);
        }}
        title={"Open in Tab"}
      />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}

function GoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <Action title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
