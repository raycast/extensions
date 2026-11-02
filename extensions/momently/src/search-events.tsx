import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CreateEventForm } from "./create-event";
import {
  deleteEvent,
  listEvents,
  MomentlyEvent,
  MomentlyNotInstalledError,
  momentlyBundleID,
  openEvent,
} from "./momently";

function formatDate(event: MomentlyEvent) {
  const date = new Date(event.date);
  return event.allDay
    ? date.toLocaleDateString(undefined, { dateStyle: "full" })
    : date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

function isHappeningNow(event: MomentlyEvent) {
  const now = Date.now();
  return new Date(event.date).getTime() <= now && now < new Date(event.endDate).getTime();
}

const repeatingLabels: Record<MomentlyEvent["repeating"], string> = {
  none: "Never",
  daily: "Every Day",
  weekly: "Every Week",
  monthly: "Every Month",
  yearly: "Every Year",
};

/** The app's list filters (`FilterType` in the app), in the app's order */
const filters = [
  { value: "all", title: "All", icon: Icon.Tray, emptyTitle: "No Events", matches: () => true },
  { value: "upcoming", title: "Upcoming", icon: Icon.Calendar, emptyTitle: "No Upcoming Events", matches: isUpcoming },
  {
    value: "past",
    title: "Past Events",
    icon: Icon.ArrowCounterClockwise,
    emptyTitle: "No Past Events",
    matches: (event: MomentlyEvent) => !isUpcoming(event),
  },
  {
    value: "flagged",
    title: "Flagged",
    icon: Icon.Flag,
    emptyTitle: "No Flagged Events",
    matches: (event: MomentlyEvent) => event.flagged,
  },
  {
    value: "shared",
    title: "Shared",
    icon: Icon.Link,
    emptyTitle: "No Shared Events",
    matches: (event: MomentlyEvent) => event.shared === true,
  },
  {
    value: "repeating",
    title: "Repeating",
    icon: Icon.Repeat,
    emptyTitle: "No Repeating Events",
    matches: (event: MomentlyEvent) => event.repeating !== "none",
  },
] as const;

type FilterValue = (typeof filters)[number]["value"];

/** Not ended yet, like the app's `!isPast` */
function isUpcoming(event: MomentlyEvent) {
  return Date.now() <= new Date(event.endDate).getTime();
}

export default function Command() {
  const [filterValue, setFilterValue] = useState<FilterValue>("upcoming");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  // Every filter works on the same events, so switching doesn't ask the app again.
  // Keyed by the app build, so cached events never show under another build's actions.
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (bundleID: string) => listEvents({ includingPast: true }),
    [momentlyBundleID()],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Couldn't load events" },
    },
  );

  const filter = filters.find((filter) => filter.value === filterValue) ?? filters[1];
  const events = data?.filter(filter.matches) ?? [];
  // The most recent past event first, as in the app
  if (filter.value === "past") events.reverse();

  async function remove(event: MomentlyEvent) {
    const confirmed = await confirmAlert({
      title: `Delete “${event.title}”?`,
      message: "The event is deleted on all your devices.",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting event…" });

    try {
      await mutate(deleteEvent(event.id), {
        optimisticUpdate: (events) => events?.filter((other) => other.id !== event.id),
      });

      toast.style = Toast.Style.Success;
      toast.title = `Deleted “${event.title}”`;
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't delete event" });
    }
  }

  const createAction = (
    <Action.Push
      title="Create Event"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateEventForm onCreate={() => revalidate()} />}
    />
  );

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && events.length > 0}
      searchBarPlaceholder="Search events"
      searchBarAccessory={
        // Remembers the last filter, like the app does
        <List.Dropdown
          tooltip="Events to Show"
          defaultValue="upcoming"
          storeValue
          onChange={(value) => setFilterValue(value as FilterValue)}
        >
          {filters.map((filter) => (
            <List.Dropdown.Item key={filter.value} title={filter.title} value={filter.value} icon={filter.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {error instanceof MomentlyNotInstalledError ? (
        <List.EmptyView
          icon={Icon.Download}
          title="Momently Isn't Installed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Momently" url="https://momently.madza.rs" />
              {refreshAction}
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Calendar}
          title={error ? "Couldn't Load Events" : filter.emptyTitle}
          description={error?.message ?? "Create one to start counting down."}
          actions={
            <ActionPanel>
              {createAction}
              {refreshAction}
            </ActionPanel>
          }
        />
      )}

      {events.map((event) => (
        <List.Item
          key={event.id}
          icon={{ source: Icon.CircleFilled, tintColor: event.color }}
          title={event.title}
          subtitle={isShowingDetail ? undefined : event.tags.map((tag) => `#${tag}`).join(" ")}
          keywords={[...event.tags, event.notes ?? ""]}
          accessories={
            isShowingDetail
              ? undefined
              : [
                  ...(event.shared ? [{ icon: Icon.Link, tooltip: "Shared" }] : []),
                  ...(event.flagged
                    ? [{ icon: { source: Icon.Flag, tintColor: Color.Orange }, tooltip: "Flagged" }]
                    : []),
                  ...(event.repeating !== "none"
                    ? [{ icon: Icon.Repeat, tooltip: repeatingLabels[event.repeating] }]
                    : []),
                  isHappeningNow(event)
                    ? { tag: { value: "Now", color: Color.Green } }
                    : { date: new Date(event.date), tooltip: formatDate(event) },
                ]
          }
          detail={
            <List.Item.Detail
              markdown={event.notes ? event.notes : undefined}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Title" text={event.title} />
                  <List.Item.Detail.Metadata.Label title="Date" text={formatDate(event)} />
                  <List.Item.Detail.Metadata.Label title="Repeats" text={repeatingLabels[event.repeating]} />
                  {event.flagged && (
                    <List.Item.Detail.Metadata.Label
                      title="Flagged"
                      icon={{ source: Icon.Flag, tintColor: Color.Orange }}
                    />
                  )}
                  {event.shared && <List.Item.Detail.Metadata.Label title="Shared" icon={Icon.Link} />}
                  {event.tags.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {event.tags.map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {event.url && <List.Item.Detail.Metadata.Link title="Website" target={event.url} text={event.url} />}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Open in Momently" icon={Icon.AppWindow} onAction={() => openEvent(event.id)} />
                <Action
                  title={isShowingDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => setIsShowingDetail((value) => !value)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {createAction}
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={event.title}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                {refreshAction}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Event"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(event)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
