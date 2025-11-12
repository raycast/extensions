import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon, useFrecencySorting } from "@raycast/utils";
import { useState } from "react";
import { useBookmarks } from "./atlas";
import { getSubtitle } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data } = useBookmarks();
  const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(data);

  const filteredData = sortedData?.filter(
    (bookmark) =>
      bookmark.name.toLowerCase().includes(searchText.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filteredData?.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          icon={getFavicon(bookmark.url, { mask: Image.Mask.Circle })}
          title={bookmark.name}
          subtitle={{ value: getSubtitle(bookmark.url), tooltip: bookmark.url }}
          accessories={[...(bookmark.folder ? [{ tag: bookmark.folder }] : []), { date: new Date(bookmark.dateAdded) }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Open
                  icon={Icon.Globe}
                  title="Open in Browser"
                  target={bookmark.url}
                  application="com.openai.atlas"
                  onOpen={() => visitItem(bookmark)}
                />
                <Action.OpenWith icon={Icon.AppWindow} path={bookmark.url} onOpen={() => visitItem(bookmark)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  content={bookmark.url}
                  title="Copy URL"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onCopy={() => visitItem(bookmark)}
                />
                <Action.CopyToClipboard
                  content={{ html: `<a href="${bookmark.url}">${bookmark.name}</a>` }}
                  title="Copy Formatted URL"
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                  onCopy={() => visitItem(bookmark)}
                />
                <Action.CopyToClipboard
                  content={bookmark.name}
                  title="Copy Title"
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                  onCopy={() => visitItem(bookmark)}
                />
                <Action.CopyToClipboard
                  content={`[${bookmark.name}](${bookmark.url})`}
                  title="Copy as Markdown"
                  onCopy={() => visitItem(bookmark)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Reset Ranking"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  onAction={() => resetRanking(bookmark)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
