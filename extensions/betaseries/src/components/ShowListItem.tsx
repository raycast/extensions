import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { Show } from "../types/betaseries";
import { ShowEpisodesList } from "./ShowEpisodesList";
import { addShowToList, archiveShow, unarchiveShow } from "../api/client";
import { useState } from "react";

interface ShowListItemProps {
  show: Show;
  isMyShow?: boolean;
  onArchiveChange?: (showId: number, archived: boolean) => void;
  notificationsEnabled?: boolean;
  onToggleNotifications?: (showId: number, enabled: boolean) => void;
  onLogout?: () => void;
}

export function ShowListItem({
  show,
  isMyShow = false,
  onArchiveChange,
  notificationsEnabled = true,
  onToggleNotifications,
  onLogout,
}: ShowListItemProps) {
  const [isAdded, setIsAdded] = useState(show.in_account);
  const isArchived = show.user?.archived ?? false;

  const handleAddToList = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding show...",
      });
      await addShowToList(show.id);
      setIsAdded(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Show added to your list",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add show",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleArchiveToggle = async () => {
    const nextArchived = !isArchived;
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: nextArchived ? "Archiving show..." : "Unarchiving show...",
      });
      if (nextArchived) {
        await archiveShow(show.id);
      } else {
        await unarchiveShow(show.id);
      }
      onArchiveChange?.(show.id, nextArchived);
      await showToast({
        style: Toast.Style.Success,
        title: nextArchived ? "Show archived" : "Show unarchived",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: nextArchived
          ? "Failed to archive show"
          : "Failed to unarchive show",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Prepare accessories based on whether this is "My Shows" or a search result
  const getAccessories = () => {
    if (isMyShow) {
      // For "My Shows", display unwatched episodes count
      const remaining = show.user?.remaining ?? 0;
      const trackingIcon = isArchived
        ? Icon.MinusCircle
        : notificationsEnabled
          ? Icon.Livestream
          : Icon.LivestreamDisabled;

      if (remaining === 0) {
        return [
          { text: "All episodes watched" },
          { icon: Icon.CheckCircle },
          { icon: trackingIcon },
        ];
      } else {
        return [
          { text: `${remaining} episode${remaining > 1 ? "s" : ""} to watch` },
          { icon: trackingIcon },
        ];
      }
    } else {
      // For search results, display seasons and episodes
      return [
        { text: `${show.seasons} seasons` },
        { text: `${show.episodes} episodes` },
        { icon: isAdded ? Icon.CheckCircle : undefined },
      ];
    }
  };

  return (
    <List.Item
      title={show.title}
      subtitle={show.creation || ""}
      icon={show.images.poster || Icon.Video}
      accessories={getAccessories()}
      actions={
        <ActionPanel>
          {isMyShow ? (
            <>
              <Action.Push
                title="View Unwatched Episodes"
                icon={Icon.List}
                target={<ShowEpisodesList show={show} />}
              />
              <Action.Paste
                title="Paste Show Title"
                content={show.title}
                shortcut={{ modifiers: ["opt"], key: "v" }}
              />
              <Action.CopyToClipboard
                title="Copy Show Title"
                content={show.title}
                shortcut={{ modifiers: ["opt"], key: "c" }}
              />
              <Action.OpenInBrowser
                url={show.resource_url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              {!isArchived && onToggleNotifications && (
                <Action
                  title={
                    notificationsEnabled
                      ? "Disable Notifications for This Show"
                      : "Enable Notifications for This Show"
                  }
                  icon={
                    notificationsEnabled
                      ? Icon.LivestreamDisabled
                      : Icon.Livestream
                  }
                  onAction={() =>
                    onToggleNotifications(show.id, !notificationsEnabled)
                  }
                />
              )}
              {onLogout && (
                <Action
                  title="Logout"
                  icon={Icon.XMarkCircle}
                  onAction={onLogout}
                />
              )}
              <Action
                title={isArchived ? "Unarchive Show" : "Archive Show"}
                icon={isArchived ? Icon.ArrowCounterClockwise : Icon.Tray}
                style={
                  isArchived ? Action.Style.Regular : Action.Style.Destructive
                }
                onAction={handleArchiveToggle}
              />
            </>
          ) : (
            <>
              {!isAdded && (
                <Action
                  title="Add to My Shows"
                  icon={Icon.Plus}
                  onAction={handleAddToList}
                />
              )}
              <Action.OpenInBrowser
                url={show.resource_url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
