import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useMemo } from "react";
import { LinkdingBookmark } from "../types/linkding-types";

interface Props {
  bookmark: LinkdingBookmark;
  preferences: Preferences;
  onDelete: (id: number) => void;
  onCopy: () => void;
}

const SearchListItem = ({ bookmark, preferences, onDelete, onCopy }: Props) => {
  const subtitle = useMemo(() => {
    if (!preferences.showDescription) {
      return "";
    }
    if (bookmark.description && bookmark.description.length > 0) {
      return bookmark.description;
    }
    return bookmark.website_description;
  }, [bookmark, preferences]);

  const tags = useMemo(() => {
    if (!preferences.showTags) {
      return [];
    }
    return bookmark.tag_names.map((tag) => ({
      tag: "#" + tag,
    }));
  }, [bookmark, preferences]);

  return (
    <List.Item
      icon={getFavicon(bookmark.url, { fallback: Icon.Globe })}
      title={bookmark.title.length > 0 ? bookmark.title : bookmark.website_title ?? bookmark.url}
      subtitle={subtitle}
      accessories={tags}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={bookmark.url} />
            <Action.OpenInBrowser
              title="Edit in Linkding"
              url={`${preferences.serverUrl}/bookmarks/${bookmark.id}/edit`}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
            <Action.CopyToClipboard content={bookmark.url} onCopy={onCopy} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action
              onAction={() => onDelete(bookmark.id)}
              icon={{ source: Icon.Trash }}
              title="Delete"
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default SearchListItem;
