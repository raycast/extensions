import { Action, ActionPanel, Icon } from "@raycast/api";
import { Enhet } from "../types";
import EmojiActionMenu from "./EmojiActionMenu";
import React from "react";

/**
 * Props for the FavoriteActions component
 */

interface FavoriteActionsProps {
  /** The favorite entity to display actions for */
  entity: Enhet;
  /** The index of this favorite in the list */
  index: number;
  /** Whether move mode indicators should be shown */
  showMoveIndicators: boolean;
  /** Callback when removing from favorites */
  onRemoveFavorite: (entity: Enhet) => void;
  /** Callback when updating emoji */
  onUpdateEmoji: (entity: Enhet, emoji?: string) => void;
  /** Callback when resetting to favicon */
  onResetToFavicon: (entity: Enhet) => void;
  /** Callback when refreshing favicon */
  onRefreshFavicon: (entity: Enhet) => void;
  /** Callback when moving favorite up */
  onMoveUp: (entity: Enhet) => void;
  /** Callback when moving favorite down */
  onMoveDown: (entity: Enhet) => void;
  /** Callback when toggling move mode */
  onToggleMoveMode: () => void;
}

/**
 * FavoriteActions component provides all actions specific to favorite entities
 * including emoji management, reordering, and removal
 */
function FavoriteActions({
  entity,
  index,
  showMoveIndicators,
  onRemoveFavorite,
  onUpdateEmoji,
  onResetToFavicon,
  onRefreshFavicon,
  onMoveUp,
  onMoveDown,
  onToggleMoveMode,
}: FavoriteActionsProps) {
  return (
    <>
      <EmojiActionMenu
        entity={entity}
        currentEmoji={entity.emoji}
        onUpdateEmoji={onUpdateEmoji}
        onResetToFavicon={onResetToFavicon}
        onRefreshFavicon={onRefreshFavicon}
      />
      <ActionPanel.Section title="Reorder">
        <Action
          title="Move Up"
          icon={Icon.ArrowUp}
          onAction={() => onMoveUp(entity)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
        />
        <Action
          title="Move Down"
          icon={Icon.ArrowDown}
          onAction={() => onMoveDown(entity)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
        />
      </ActionPanel.Section>
      <Action
        title="Remove from Favorites"
        onAction={() => onRemoveFavorite(entity)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
      {index === 0 && (
        <ActionPanel.Section title="Move Mode">
          <Action
            title={showMoveIndicators ? "Disable Move Mode" : "Enable Move Mode"}
            icon={showMoveIndicators ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleMoveMode}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel.Section>
      )}
    </>
  );
}

// Memoize component for better performance
export default React.memo(FavoriteActions);
