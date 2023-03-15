import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { openHistoryTab, openNewTab, setActiveTab } from "../actions";
import { HistoryEntry, Tab } from "../interfaces";

export class FirefoxActions {
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
      <MozillaFirefoxHistoryTab url={url} />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}

function TabListItemAction(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <MozillaFirefoxGoToTab tab={props.tab} />
      <Action.CopyToClipboard title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}

function MozillaFirefoxGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }
  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}

function MozillaFirefoxHistoryTab({ url }: { url: string }) {
  async function handleAction() {
    await openHistoryTab(url);
    await closeMainWindow();
  }
  return <ActionPanel.Item title="Open in Firefox" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
