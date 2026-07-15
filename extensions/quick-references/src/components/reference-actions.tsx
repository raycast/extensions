import { Action, ActionPanel, Icon } from "@raycast/api";
import { ReferenceIndexItem } from "../types";

interface ReferenceActionPanelProps {
  entry: ReferenceIndexItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  detailTarget?: React.ReactElement;
  onOpen?: () => void;
  onUpdate?: () => void;
}

export function ReferenceActionPanel({
  entry,
  isFavorite,
  onToggleFavorite,
  detailTarget,
  onOpen,
  onUpdate,
}: ReferenceActionPanelProps) {
  return (
    <ActionPanel>
      {detailTarget && (
        <Action.Push
          title="Open Detail"
          icon={Icon.Sidebar}
          target={detailTarget}
          onPush={onOpen}
        />
      )}
      {entry.topSnippet && (
        <Action.CopyToClipboard
          title="Copy Top Snippet"
          content={entry.topSnippet}
          icon={Icon.Clipboard}
        />
      )}
      <Action.CopyToClipboard title="Copy Title" content={entry.title} />
      <Action.CopyToClipboard title="Copy Link" content={entry.link} />
      <Action.OpenInBrowser url={entry.link} />
      <Action
        title={isFavorite ? "Remove Favorite" : "Add Favorite"}
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={onToggleFavorite}
      />
      {onUpdate && (
        <Action
          title="Update References"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          onAction={onUpdate}
        />
      )}
    </ActionPanel>
  );
}
