import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getSubtitle } from "../utils";

const DIA_BUNDLE_ID = "company.thebrowser.dia";

interface URLListItemProps {
  url: string;
  searchText: string;
}

export function URLListItem({ url, searchText }: URLListItemProps) {
  const normalizedUrl = /^\S+:\/\//.test(url) ? url : `https://${url}`;

  return (
    <List.Item
      icon={getFavicon(normalizedUrl)}
      title={`Open ${url}`}
      subtitle={getSubtitle(normalizedUrl)}
      actions={
        <ActionPanel>
          <Action.Open
            icon={Icon.Globe}
            title="Open in Dia"
            target={normalizedUrl}
            application={DIA_BUNDLE_ID}
            onOpen={async () => {
              await closeMainWindow();
            }}
          />
          <Action.OpenInBrowser
            title="Search Google Instead"
            url={`https://www.google.com/search?q=${encodeURIComponent(searchText)}`}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard content={normalizedUrl} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
