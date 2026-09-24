import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { buildNewTabUrl, newTabTitle, openHistoryTab, openInNewWindow, openNewTab } from "../actions";
import { HistoryEntry } from "../interfaces";

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
  const title = newTabTitle(query);
  return (
    <ActionPanel title="New Tab">
      <Action onAction={() => openNewTab(query)} title={title} />
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
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
      <EditUrlAction url={url} onEditUrl={onEditUrl} />
    </ActionPanel>
  );
}

function MozillaFirefoxHistoryTab({ url }: { url: string }) {
  return <Action title="Open in Firefox" icon={{ source: Icon.Eye }} onAction={() => openHistoryTab(url)} />;
}
