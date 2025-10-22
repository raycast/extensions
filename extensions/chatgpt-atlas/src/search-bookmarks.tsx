import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useBookmarks } from "./atlas";
import { getSubtitle } from "./utils";

export default function Command() {
  const { isLoading, data } = useBookmarks();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarks...">
      {data?.map((bookmark) => (
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
                />
                <Action.OpenWith icon={Icon.AppWindow} path={bookmark.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  content={bookmark.url}
                  title="Copy URL"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  content={{ html: `<a href="${bookmark.url}">${bookmark.name}</a>` }}
                  title="Copy Formatted URL"
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <Action.CopyToClipboard
                  content={bookmark.name}
                  title="Copy Title"
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard content={`[${bookmark.name}](${bookmark.url})`} title="Copy as Markdown" />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
