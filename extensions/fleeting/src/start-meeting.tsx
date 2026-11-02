import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { MEETINGS, Meeting, MeetingCategory } from "./data/meetings";
import { useFavorites } from "./lib/favorites";
import { meetingUrl } from "./lib/urls";
import { BlockCalendarForm } from "./block-calendar";

const CATEGORY_ICONS: Record<MeetingCategory, Icon> = {
  engineering: Icon.Code,
  business: Icon.BarChart,
  security: Icon.Lock,
  social: Icon.SpeechBubble,
  crisis: Icon.ExclamationMark,
};

export default function Command() {
  const { favorites, toggleFavorite, isLoading } = useFavorites();
  const favoriteMeetings = favorites.flatMap((id) => MEETINGS.filter((m) => m.id === id));
  const others = MEETINGS.filter((m) => !favorites.includes(m.id));

  const renderItem = (meeting: Meeting) => {
    const isFavorite = favorites.includes(meeting.id);
    return (
      <List.Item
        key={meeting.id}
        title={meeting.title}
        subtitle={meeting.description}
        icon={CATEGORY_ICONS[meeting.category]}
        keywords={[meeting.id, meeting.category, ...meeting.keywords]}
        accessories={isFavorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : []}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Meeting" url={meetingUrl(meeting.id)} />
            <Action.CopyToClipboard
              title="Copy Meeting Link"
              content={meetingUrl(meeting.id)}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
            />
            <Action.Push
              title="Block Calendar"
              icon={Icon.Calendar}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
              target={<BlockCalendarForm meetingId={meeting.id} />}
            />
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
              onAction={async () => {
                await toggleFavorite(meeting.id);
                await showToast({
                  style: Toast.Style.Success,
                  title: isFavorite ? "Removed from favorites" : "Added to favorites",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search meetings">
      {favoriteMeetings.length > 0 && <List.Section title="Favorites">{favoriteMeetings.map(renderItem)}</List.Section>}
      <List.Section title={favoriteMeetings.length > 0 ? "All Meetings" : undefined}>
        {others.map(renderItem)}
      </List.Section>
    </List>
  );
}
