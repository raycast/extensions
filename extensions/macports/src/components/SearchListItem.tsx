import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { installPort, uninstallPort } from "../exec";
import type { SearchResult } from "../types";
import PortDetails from "../port-details";

export default function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ text: searchResult.username }]}
      icon={searchResult.installed ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Details" target={<PortDetails portName={searchResult.name} />} />
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>

          {!searchResult.installed && (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={`sudo port install ${searchResult.name}`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action title="Install" onAction={() => installPort(searchResult.name)} />
            </ActionPanel.Section>
          )}
          {searchResult.installed && (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Uninstall Command"
                content={`sudo port uninstall ${searchResult.name}`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action title="Uninstall" onAction={() => uninstallPort(searchResult.name)} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
