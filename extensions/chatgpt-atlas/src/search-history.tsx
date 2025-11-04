import { ActionPanel, Action, List, Image, Keyboard, Icon } from "@raycast/api";
import { useSearchHistory } from "./atlas";
import { useState } from "react";
import { getFavicon } from "@raycast/utils";
import { getSubtitle } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data, permissionView } = useSearchHistory(searchText);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {data?.map((row) => (
        <List.Item
          key={row.id}
          icon={getFavicon(row.url, { mask: Image.Mask.Circle })}
          title={row.title}
          subtitle={{ value: getSubtitle(row.url), tooltip: row.url }}
          accessories={[{ date: new Date(row.lastVisitedAt) }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Open
                  icon={Icon.Globe}
                  title="Open in Browser"
                  target={row.url}
                  application="com.openai.atlas"
                />
                <Action.OpenWith icon={Icon.AppWindow} path={row.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard content={row.url} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action.CopyToClipboard
                  content={{ html: `<a href="${row.url}">${row.title}</a>` }}
                  title="Copy Formatted URL"
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <Action.CopyToClipboard
                  content={row.title}
                  title="Copy Title"
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard content={`[${row.title}](${row.url})`} title="Copy as Markdown" />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CreateQuicklink
                  quicklink={{ link: row.url, name: row.title }}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
