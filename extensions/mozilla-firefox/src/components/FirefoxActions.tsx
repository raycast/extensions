import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { buildNewTabUrl, openHistoryTab, openInNewWindow, openNewTab, setActiveTab } from "../actions";
import { HistoryEntry, Tab } from "../interfaces";

function OpenInNewWindowAction({ url }: { url?: string }) {
  if (process.platform !== "win32") return null;
  return (
    <Action
      title="Open in New Window"
      icon={{ source: Icon.Window }}
      shortcut={{
        macOS: { modifiers: ["ctrl"], key: "enter" },
        Windows: { modifiers: ["ctrl"], key: "enter" },
      }}
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
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
      {url ? <OpenInNewWindowAction url={url} /> : null}
    </ActionPanel>
  );
}

export function TabListItemAction(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <MozillaFirefoxGoToTab tab={props.tab} />
      <Action.CopyToClipboard title="Copy URL" content={props.tab.url} />
      {props.tab.url ? <OpenInNewWindowAction url={props.tab.url} /> : null}
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
