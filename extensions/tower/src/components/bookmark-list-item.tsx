import { Action, ActionPanel, Application, Color, List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import OpenBookMarkAction from "./open-bookmark-action";

export default function BookmarkListItem(props: {
  bookmark: Bookmark;
  defaultTerminalApplication: Application;
  defaultEditorApplication: Application;
}) {
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
              title={`Open in ${props.defaultEditorApplication.name}`}
              icon={{ fileIcon: props.defaultEditorApplication.path }}
              target={bookmark.getPath}
              application={props.defaultEditorApplication}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.Open
              title={`Open in ${props.defaultTerminalApplication.name}`}
              icon={{ fileIcon: props.defaultTerminalApplication.path }}
              target={bookmark.getPath}
              application={props.defaultTerminalApplication}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.Open
              title="Open in Warp"
              icon="icon-warp.png"
              target={bookmark.getPath}
              application="Warp"
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
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
          text: bookmark.getBranch.name,
          icon: { source: "icon-branches.png", tintColor: Color.PrimaryText },
        },
      ]}
    />
  );
}
