import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import OpenBookmarkAction from "./open-bookmark-action";

export default function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark: Bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.name}
      icon={{ source: "repository-30.png", tintColor: Color.Yellow }}
      accessories={[
        {
          text: bookmark.getBranch.name,
          icon: { source: "merge-git-30.png", tintColor: Color.SecondaryText },
        },
      ]}
      keywords={[
        ...bookmark.getBranch.name.replaceAll("_", "-").replaceAll("\\", "-").split("-"),
        ...bookmark.getPath.split("\\"),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookmarkAction bookmark={bookmark} />
            <Action.ShowInFinder path={bookmark.getPath} />
            <Action.OpenWith path={bookmark.getPath} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
            <Action.Open
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Open in VScode"
              icon="visual-studio-code-30.png"
              target={bookmark.getPath}
              application="Visual Studio Code"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Open
              title="Open in iTerm"
              icon={Icon.Terminal}
              target={bookmark.getPath}
              application="iTerm"
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Name"
              content={bookmark.name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={bookmark.getPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
