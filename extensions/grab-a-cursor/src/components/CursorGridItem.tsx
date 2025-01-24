import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { CursorItem } from "../types/cursor";
import { PasteCursorAction } from "./PasteCursorAction";

interface CursorGridItemProps {
  cursor: CursorItem;
  onCopy: (cursor: CursorItem) => void;
  onFavorite: (cursor: CursorItem) => void;
  onRemoveFavorite: (cursor: CursorItem) => void;
  onResetFrequentlyUsed?: () => void;
  showResetAction?: boolean;
  currentDisplaySize: "small" | "medium" | "large";
  onDisplaySizeChange: (size: "small" | "medium" | "large") => void;
}

export function CursorGridItem({
  cursor,
  onCopy,
  onFavorite,
  onRemoveFavorite,
  onResetFrequentlyUsed,
  showResetAction,
  currentDisplaySize,
  onDisplaySizeChange,
}: CursorGridItemProps) {
  return (
    <Grid.Item
      key={cursor.id}
      title={cursor.name}
      content={{
        source: cursor.path,
        fallback: Icon.Circle,
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={cursor.content}
              title={`Copy ${cursor.name}`}
              onCopy={() => onCopy(cursor)}
            />
            <PasteCursorAction cursor={cursor} />
            {cursor.isFavorited ? (
              <Action
                icon={Icon.HeartDisabled}
                title="Remove from Favorites"
                onAction={() => onRemoveFavorite(cursor)}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
            ) : (
              <Action
                icon={Icon.Heart}
                title="Add to Favorites"
                onAction={() => onFavorite(cursor)}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Display Size">
            {currentDisplaySize !== "small" && (
              <Action
                icon={Icon.AppWindowGrid3x3}
                title="Small"
                shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                onAction={() => onDisplaySizeChange("small")}
              />
            )}
            {currentDisplaySize !== "medium" && (
              <Action
                icon={
                  currentDisplaySize === "small"
                    ? Icon.AppWindowGrid3x3
                    : Icon.AppWindowGrid2x2
                }
                title="Medium"
                shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                onAction={() => onDisplaySizeChange("medium")}
              />
            )}
            {currentDisplaySize !== "large" && (
              <Action
                icon={
                  currentDisplaySize === "small" ||
                  currentDisplaySize === "medium"
                    ? Icon.AppWindowGrid2x2
                    : Icon.AppWindowGrid3x3
                }
                title="Large"
                shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                onAction={() => onDisplaySizeChange("large")}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {showResetAction && onResetFrequentlyUsed && (
              <Action
                icon={Icon.RotateClockwise}
                title="Reset Frequently Used"
                onAction={onResetFrequentlyUsed}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
