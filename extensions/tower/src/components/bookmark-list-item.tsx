import { ActionPanel, CopyToClipboardAction, Icon, List, OpenAction, ShowInFinderAction } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import OpenBookMarkAction from "./open-bookmark-action";

export default function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark: Bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.RepositoryIdentifier}
      title={bookmark.Name}
      icon={Icon.Circle}
      accessoryTitle={bookmark.getBranch}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookMarkAction bookmark={bookmark} />
            <ShowInFinderAction path={bookmark.getPath} />
            <OpenAction
              title="Open in Code"
              icon="vscode-icon.png"
              target={bookmark.getPath}
              application="Visual Studio Code"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
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
