import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Meeting } from "../types";
import { formatDate, formatDuration, generateDeepLink } from "../utils";
import { MeetingDetail } from "./MeetingDetail";
import { isFavorite, toggleFavorite } from "../favorites";

interface MeetingListItemProps {
  meeting: Meeting;
  apiKey: string;
  dateFormat?: "relative" | "absolute";
  onLoadMore?: () => void;
  onRefresh?: () => void;
  hasMore?: boolean;
  isPinned?: boolean;
}

export function MeetingListItem({
  meeting,
  apiKey,
  dateFormat = "relative",
  onLoadMore,
  onRefresh,
  hasMore,
  isPinned = false,
}: MeetingListItemProps) {
  const [isFav, setIsFav] = useState(isPinned);
  const participantCount = meeting.invitees?.length || 0;

  useEffect(() => {
    isFavorite(meeting.id).then(setIsFav);
  }, [meeting.id]);

  const handleToggleFavorite = async () => {
    const newState = await toggleFavorite(meeting);
    setIsFav(newState);
    await showToast({
      style: Toast.Style.Success,
      title: newState ? "Added to favorites" : "Removed from favorites",
    });
    onRefresh?.();
  };

  const handleCopyDeepLink = async () => {
    const deepLink = generateDeepLink(meeting.id);
    await Clipboard.copy(deepLink);
    await showToast({
      style: Toast.Style.Success,
      title: "Deep link copied",
      message: "Paste in Raycast to open this meeting",
    });
  };

  return (
    <List.Item
      key={meeting.id}
      title={meeting.name}
      subtitle={meeting.organizer?.name || meeting.organizer?.email}
      icon={isFav ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Video}
      accessories={[
        ...(isFav
          ? [
              {
                icon: { source: Icon.Pin, tintColor: Color.Orange },
                tooltip: "Pinned",
              },
            ]
          : []),
        ...(participantCount > 0
          ? [
              {
                text: `${participantCount}`,
                icon: Icon.TwoPeople,
                tooltip: "Participants",
              },
            ]
          : []),
        { text: formatDuration(meeting.duration), icon: Icon.Clock },
        { text: formatDate(meeting.happenedAt, dateFormat) },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<MeetingDetail meeting={meeting} apiKey={apiKey} />}
            />
            <Action.OpenInBrowser
              title="Open in Tl;dv"
              url={meeting.url}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Organize">
            <Action
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFav ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleToggleFavorite}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Meeting URL"
              content={meeting.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Meeting Title"
              content={meeting.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
            <Action
              title="Copy Deep Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={handleCopyDeepLink}
            />
            <Action.CopyToClipboard
              title="Copy Meeting ID"
              content={meeting.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Actions">
            {hasMore && onLoadMore && (
              <Action
                title="Load More"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={onLoadMore}
              />
            )}
            {onRefresh && (
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={onRefresh}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default MeetingListItem;
