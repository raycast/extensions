import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import { GitStatus } from "../hooks/use-batch-git-status";
import OpenBookmarkAction from "./open-bookmark-action";

interface BookmarkListItemProps {
  bookmark: Bookmark;
  idPrefix?: string;
  isPinned?: boolean;
  isRecent?: boolean;
  gitStatus?: GitStatus;
  onTogglePin?: (id: string) => void;
  onOpen?: (id: string) => void;
  onClearRecent?: (id: string) => void;
}

export default function BookmarkListItem(props: BookmarkListItemProps) {
  const { bookmark, idPrefix, isPinned, isRecent, gitStatus, onTogglePin, onOpen, onClearRecent } = props;

  if (!bookmark) return null;

  const itemId = idPrefix ? `${idPrefix}-${bookmark.id}` : bookmark.id;

  const statusAccessory =
    gitStatus === "dirty"
      ? { icon: { source: Icon.CircleFilled, tintColor: Color.Orange }, tooltip: "Uncommitted changes" }
      : gitStatus === "clean"
        ? { icon: { source: Icon.CircleFilled, tintColor: Color.Green }, tooltip: "Clean" }
        : undefined;

  return (
    <List.Item
      id={itemId}
      title={bookmark.name}
      icon={{ source: "repository-30.png", tintColor: Color.Yellow }}
      accessories={[
        ...(statusAccessory ? [statusAccessory] : []),
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
            <OpenBookmarkAction bookmark={bookmark} onOpen={() => onOpen?.(bookmark.id)} />
            <Action.ShowInFinder path={bookmark.getPath} />
            <Action.OpenWith path={bookmark.getPath} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
            <Action.Open
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Open in VScode"
              icon="vscode-alt.svg"
              target={bookmark.getPath}
              application="Visual Studio Code"
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onOpen={() => onOpen?.(bookmark.id)}
            />
            <Action.Open
              title="Open in iTerm"
              icon={Icon.Terminal}
              target={bookmark.getPath}
              application="iTerm"
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onOpen={() => onOpen?.(bookmark.id)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {onTogglePin && (
              <Action
                title={isPinned ? "Unpin Repository" : "Pin Repository"}
                icon={isPinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => onTogglePin(bookmark.id)}
              />
            )}
            {isRecent && onClearRecent && (
              <Action title="Remove from Recent" icon={Icon.XMarkCircle} onAction={() => onClearRecent(bookmark.id)} />
            )}
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
