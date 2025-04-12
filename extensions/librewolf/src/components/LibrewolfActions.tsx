import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { openHistoryTab, openNewTab, setActiveTab } from "../actions";
import { HistoryEntry, Tab } from "../interfaces";

export class LibrewolfActions {
  public static NewTab = NewTabAction;
  public static HistoryItem = HistoryItemAction;
  public static TabListItem = TabListItemAction;
}

function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item onAction={() => openNewTab(query)} title={query ? `Search "${query}"` : "Open Empty Tab"} />
    </ActionPanel>
  );
}

function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title}>
      <LibrewolfHistoryTab url={url} />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}

function TabListItemAction(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <LibrewolfGoToTab tab={props.tab} />
      <Action.CopyToClipboard title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}

function LibrewolfGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    try {
      await setActiveTab(props.tab);
      await closeMainWindow();
    } catch (error) {
      showFailureToast(error, { title: "Failed to open tab" });
    }
  }
  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}

function LibrewolfHistoryTab({ url }: { url: string }) {
  async function handleAction() {
    await openHistoryTab(url);
    await closeMainWindow();
  }
  return <ActionPanel.Item title="Open in Librewolf" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
