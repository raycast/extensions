import { Action, ActionPanel, Icon } from "@raycast/api";
import { buildNewTabUrl, focusFirefox, looksLikeUrl, openHistoryTab, openInNewWindow, openNewTab } from "../actions";
import { HistoryEntry, Tab } from "../interfaces";

function OpenInNewWindowAction({ url }: { url?: string }) {
  if (process.platform !== "win32") return null;
  return <Action title="Open in New Window" icon={{ source: Icon.Window }} onAction={() => openInNewWindow(url)} />;
}

function EditUrlAction({ url, onEditUrl }: { url?: string; onEditUrl?: (url: string) => void }) {
  if (!onEditUrl || !url) return null;
  return (
    <Action
      title="Edit URL in Search Bar"
      icon={{ source: Icon.Pencil }}
      shortcut={{ modifiers: ["shift"], key: "return" }}
      onAction={() => onEditUrl(url)}
    />
  );
}

export function NewTabAction({ query }: { query?: string }) {
  const title = !query ? "Open Empty Tab" : looksLikeUrl(query) ? "Open URL" : `Search "${query}"`;
  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item onAction={() => openNewTab(query)} title={title} />
      <OpenInNewWindowAction url={buildNewTabUrl(query)} />
    </ActionPanel>
  );
}

export function HistoryItemAction({
  entry: { title, url },
  onEditUrl,
}: {
  entry: HistoryEntry;
  onEditUrl?: (url: string) => void;
}) {
  return (
    <ActionPanel title={title}>
      <MozillaFirefoxHistoryTab url={url} />
      {url ? <OpenInNewWindowAction url={url} /> : null}
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
      <EditUrlAction url={url} onEditUrl={onEditUrl} />
    </ActionPanel>
  );
}

export function TabListItemAction({ tab, onEditUrl }: { tab: Tab; onEditUrl?: (url: string) => void }) {
  return (
    <ActionPanel title={tab.title}>
      <Action title="Focus Firefox" icon={{ source: Icon.Eye }} onAction={() => focusFirefox()} />
      {tab.url ? <OpenInNewWindowAction url={tab.url} /> : null}
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
      <EditUrlAction url={tab.url} onEditUrl={onEditUrl} />
    </ActionPanel>
  );
}

function MozillaFirefoxHistoryTab({ url }: { url: string }) {
  return <ActionPanel.Item title="Open in Firefox" icon={{ source: Icon.Eye }} onAction={() => openHistoryTab(url)} />;
}
