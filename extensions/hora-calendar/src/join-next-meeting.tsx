import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { joinEvent } from "./actions";
import { showFailure } from "./feedback";
import { HoraEvent, HoraNotInstalledError, HoraOutdatedError, upcomingEvents } from "./hora";
import { HoraRequired } from "./hora-required";

export default function Command() {
  const { dateLocale } = getPreferenceValues<Preferences.JoinNextMeeting>();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    () => upcomingEvents({ limit: 25, withMeetingLinks: true }),
    [],
    {
      initialData: [],
      // Anything that is not "you need hora" gets a toast; the two that are
      // get the whole screen below.
      onError: (failure) => {
        if (failure instanceof HoraNotInstalledError || failure instanceof HoraOutdatedError) return;
        showFailure(failure, "Could not read your calendar");
      },
    },
  );

  if (error instanceof HoraNotInstalledError) return <HoraRequired reason="missing" />;
  if (error instanceof HoraOutdatedError) return <HoraRequired reason="outdated" />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your meetings">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read your calendar"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No meetings with a link"
          description="Nothing in the next week has a joinable conference."
        />
      )}
      {data.map((event) => (
        <List.Item
          key={event.id}
          title={event.title}
          subtitle={event.accountEmail}
          icon={{ source: Icon.Dot, tintColor: event.calendarColorHex ?? Color.SecondaryText }}
          accessories={[
            { text: relativeWhen(event, dateLocale), tooltip: new Date(event.start).toLocaleString(dateLocale) },
          ]}
          actions={
            <ActionPanel>
              <Action title="Join Meeting" icon={Icon.Video} onAction={() => joinEvent(event)} />
              {event.conferenceLink && (
                <Action.CopyToClipboard
                  title="Copy Meeting Link"
                  content={event.conferenceLink}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** "in 20 min", "14:30", "Thu 09:00" — whichever tells you the most at a glance. */
function relativeWhen(event: HoraEvent, locale: string): string {
  const start = new Date(event.start);
  const minutesAway = Math.round((start.getTime() - Date.now()) / 60_000);

  if (minutesAway <= 0 && new Date(event.end).getTime() > Date.now()) return "now";
  if (minutesAway > 0 && minutesAway < 60) return `in ${minutesAway} min`;

  const isToday = start.toDateString() === new Date().toDateString();
  return isToday
    ? start.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
    : start.toLocaleString(locale, { weekday: "short", hour: "numeric", minute: "2-digit" });
}
