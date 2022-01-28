import { ActionPanel, Color, CopyToClipboardAction, List, OpenAction, ShowInFinderAction } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import OpenBookMarkAction from "./open-bookmark-action";

export default function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark: Bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.RepositoryIdentifier}
      title={bookmark.Name}
      icon={{ source: "icon-folder.png", tintColor: Color.Blue }}
      accessoryTitle={bookmark.getBranch}
      accessoryIcon={{ source: "icon-branches.png", tintColor: Color.PrimaryText }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookMarkAction bookmark={bookmark} />
            <ShowInFinderAction path={bookmark.getPath} />
            <OpenAction
              title="Open in Code"
              icon="icon-vscode.png"
              target={bookmark.getPath}
              application="Visual Studio Code"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <OpenAction
              title="Open in iTerm"
              icon="icon-iterm.png"
              target={bookmark.getPath}
              application="iTerm"
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy Name"
              content={bookmark.Name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <CopyToClipboardAction
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
