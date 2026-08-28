import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getSearchActionTitle, getSearchEngine, getSearchUrl } from "../search-engines";
import { getSubtitle } from "../utils";

const DIA_BUNDLE_ID = "company.thebrowser.dia";

interface URLListItemProps {
  url: string;
  searchText: string;
}

export function URLListItem({ url, searchText }: URLListItemProps) {
  const normalizedUrl = /^\S+:\/\//.test(url) ? url : `https://${url}`;
  const searchEngine = getSearchEngine();

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
            title={`${getSearchActionTitle(searchEngine)} Instead`}
            url={getSearchUrl(searchText, searchEngine)}
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
