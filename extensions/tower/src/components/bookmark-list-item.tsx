import { Action, ActionPanel, Color, List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import OpenBookMarkAction from "./open-bookmark-action";

export default function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark: Bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.RepositoryIdentifier}
      title={bookmark.Name}
      icon={{ source: "icon-folder.png", tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookMarkAction bookmark={bookmark} />
            <Action.ShowInFinder path={bookmark.getPath} />
            <Action.OpenWith path={bookmark.getPath} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
            <Action.Open
              title="Open in Code"
              icon="icon-vscode.png"
              target={bookmark.getPath}
              application="Visual Studio Code"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Open
              title="Open in iTerm"
              icon="icon-iterm.png"
              target={bookmark.getPath}
              application="iTerm"
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Name"
              content={bookmark.Name}
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
      accessories={[
        {
          text: bookmark.getBranch,
          icon: { source: "icon-branches.png", tintColor: Color.PrimaryText },
        },
      ]}
    />
  );
}
