import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { joinEvent } from "./actions";
import { showFailure } from "./feedback";
import { clock } from "./format";
import {
  deleteEvent,
  HoraEvent,
  HoraNotInstalledError,
  HoraOutdatedError,
  respondToEvent,
  upcomingEvents,
} from "./hora";
import { HoraRequired } from "./hora-required";

type Response = Parameters<typeof respondToEvent>[1];

const RESPONSES: { response: Response; title: string; done: string; icon: Icon }[] = [
  { response: "accepted", title: "Accept", done: "Accepted", icon: Icon.CheckCircle },
  { response: "tentative", title: "Maybe", done: "Replied maybe to", icon: Icon.QuestionMarkCircle },
  { response: "declined", title: "Decline", done: "Declined", icon: Icon.XMarkCircle },
];

export default function Command() {
  const { dateLocale } = getPreferenceValues<Preferences.TodaysAgenda>();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    () => {
      const now = new Date();
      // Everything through tomorrow: the day after tomorrow starts at midnight.
      return upcomingEvents({ limit: 50, ending: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2) });
    },
    [],
    {
      initialData: [],
      onError: (failure) => {
        if (failure instanceof HoraNotInstalledError || failure instanceof HoraOutdatedError) return;
        showFailure(failure, "Could not read your calendar");
      },
    },
  );

  if (error instanceof HoraNotInstalledError) return <HoraRequired reason="missing" />;
  if (error instanceof HoraOutdatedError) return <HoraRequired reason="outdated" />;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const sorted = [...data].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  // Events that began earlier and are still running belong to today.
  const sections = [
    { title: "Today", events: sorted.filter((e) => Date.parse(e.start) < tomorrow) },
    { title: "Tomorrow", events: sorted.filter((e) => Date.parse(e.start) >= tomorrow) },
  ];

  async function respond(event: HoraEvent, response: Response, done: string) {
    try {
      await respondToEvent(event.id, response);
      await showToast({ style: Toast.Style.Success, title: `${done} ${event.title}` });
    } catch (failure) {
      await showFailure(failure, "Could not send your response");
    }
  }

  async function remove(event: HoraEvent) {
    const confirmed = await confirmAlert({
      title: `Delete “${event.title}”?`,
      message: "Guests will not be notified.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteEvent(event.id);
      await showToast({ style: Toast.Style.Success, title: "Event deleted" });
      revalidate();
    } catch (failure) {
      await showFailure(failure, "Could not delete the event");
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your agenda">
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
          title="Nothing left today"
          description="No more events today or tomorrow."
        />
      )}
      {sections
        .filter((section) => section.events.length > 0)
        .map((section) => (
          <List.Section key={section.title} title={section.title}>
            {section.events.map((event) => (
              <List.Item
                key={event.id}
                title={event.title}
                subtitle={event.accountEmail}
                icon={{ source: Icon.Dot, tintColor: event.calendarColorHex ?? Color.SecondaryText }}
                accessories={[
                  {
                    text: event.isAllDay
                      ? "All day"
                      : `${clock(event.start, dateLocale)} – ${clock(event.end, dateLocale)}`,
                    tooltip: event.calendarName,
                  },
                ]}
                actions={
                  <ActionPanel>
                    {event.conferenceLink && (
                      <Action title="Join Meeting" icon={Icon.Video} onAction={() => joinEvent(event)} />
                    )}
                    <ActionPanel.Submenu title="RSVP" icon={Icon.Envelope}>
                      {RESPONSES.map(({ response, title, done, icon }) => (
                        <Action
                          key={response}
                          title={title}
                          icon={icon}
                          onAction={() => respond(event, response, done)}
                        />
                      ))}
                    </ActionPanel.Submenu>
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
                    <Action
                      title="Delete Event"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(event)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
