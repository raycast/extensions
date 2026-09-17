import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { buildNewTabUrl, openHistoryTab, openInNewWindow, openNewTab, setActiveTab } from "../actions";
import { HistoryEntry, Tab } from "../interfaces";

const isWindows = process.platform === "win32";

function OpenInNewWindowAction({ url }: { url?: string }) {
  if (!isWindows) return null;
  return (
    <Action
      title="Open in New Window"
      shortcut={{ modifiers: ["ctrl"], key: "enter" }}
      onAction={() => openInNewWindow(url)}
    />
  );
}

export function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item onAction={() => openNewTab(query)} title={query ? `Search "${query}"` : "Open Empty Tab"} />
      <OpenInNewWindowAction url={buildNewTabUrl(query)} />
    </ActionPanel>
  );
}

export function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title}>
      <MozillaFirefoxHistoryTab url={url} />
      {url ? <OpenInNewWindowAction url={url} /> : null}
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}

export function TabListItemAction(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <MozillaFirefoxGoToTab tab={props.tab} />
      {props.tab.url ? <OpenInNewWindowAction url={props.tab.url} /> : null}
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
  return <ActionPanel.Item title="Open in Firefox" icon={{ source: Icon.Eye }} onAction={() => openHistoryTab(url)} />;
}
