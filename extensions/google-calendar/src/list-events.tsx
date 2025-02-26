import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { getCalendarClient, useEvents, withGoogleAPIs } from "./google";
import { showFailureToast } from "@raycast/utils";
import { calendar_v3 } from "@googleapis/calendar";
import { formatRecurrence } from "./utils";

function getAccessories(event: calendar_v3.Schema$Event) {
  const accessories = new Array<List.Item.Accessory>();

  if (event.recurrence || event.recurringEventId) {
    const accessory: List.Item.Accessory = {
      icon: Icon.Repeat,
      tooltip: event.recurrence ? formatRecurrence(event.recurrence) : undefined,
    };
    accessories.push(accessory);
  }

  if (event.conferenceData) {
    accessories.push({
      icon: event.conferenceData.conferenceSolution?.iconUri ?? Icon.Video,
      tooltip: `Conference: ${event.conferenceData.conferenceSolution?.name}`,
    });
  }

  if (event.attendees) {
    const accessory: List.Item.Accessory = {
      text: `${event.attendees.length}`,
      icon: Icon.Person,
      tooltip: event.attendees.map((attendee) => `${attendee.email} (${attendee.responseStatus})`).join("\n"),
    };
    accessories.push(accessory);
  }

  return accessories;
}

function getStatusColor(event: calendar_v3.Schema$Event) {
  const status = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
  switch (status) {
    case "accepted":
      return Color.Green;
    case "tentative":
      return Color.Yellow;
    case "declined":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

function getStatusIcon(event: calendar_v3.Schema$Event) {
  const status = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
  switch (status) {
    case "accepted":
      return Icon.CheckCircle;
    case "tentative":
      return Icon.CircleDisabled;
    case "declined":
      return Icon.XMarkCircle;
    default:
      return Icon.QuestionMarkCircle;
  }
}

function getStatusTooltip(event: calendar_v3.Schema$Event) {
  const status = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
  return `Status: ${status ?? "-"}`;
}

function getIcon(event: calendar_v3.Schema$Event) {
  return {
    value: { source: getStatusIcon(event), tintColor: getStatusColor(event) },
    tooltip: getStatusTooltip(event),
  };
}

function Command() {
  const { data, isLoading, pagination, revalidate } = useEvents();

  const sections =
    data?.reduce(
      (acc, event) => {
        const date = new Date(event.start?.dateTime ?? event.start?.date ?? "");
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() + 2); // Start after tomorrow
        const nextWeekEnd = new Date(now);
        nextWeekEnd.setDate(now.getDate() + 7);

        let section;

        if (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        ) {
          section = "Today";
        } else if (
          date.getFullYear() === tomorrow.getFullYear() &&
          date.getMonth() === tomorrow.getMonth() &&
          date.getDate() === tomorrow.getDate()
        ) {
          section = "Tomorrow";
        } else if (date >= nextWeekStart && date <= nextWeekEnd) {
          section = "Next Week";
        } else if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
          section = `Rest of ${date.toLocaleString("default", { month: "long" })}`;
        } else {
          // Group by month name
          section = date.toLocaleString("default", { month: "long" });
        }

        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(event);
        return acc;
      },
      {} as Record<string, calendar_v3.Schema$Event[]>,
    ) ?? {};

  // Sort sections by date
  const sectionOrder = Object.keys(sections).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Tomorrow") return -1;
    if (b === "Tomorrow") return 1;

    // Compare month/year sections
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  const formatEventTime = (event: calendar_v3.Schema$Event, section: string) => {
    const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");
    const endDate = new Date(event.end?.dateTime ?? event.end?.date ?? "");

    // For Today or Tomorrow, show only time
    if (section === "Today" || section === "Tomorrow") {
      // Check if it's an all-day event
      if (event.start?.date) {
        return "All day";
      } else {
        return `${startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    }

    // For month sections, show weekday and date
    return startDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric" });
  };

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {sectionOrder.map((section) => {
        const events = sections[section];
        if (!events?.length) return null;

        return (
          <List.Section key={section} title={section}>
            {events.map((event) => (
              <List.Item
                key={event.id}
                icon={getIcon(event)}
                title={event.summary ?? "Untitled Event"}
                subtitle={formatEventTime(event, section)}
                accessories={getAccessories(event)}
                actions={<Actions event={event} revalidate={revalidate} />}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function Actions({ event, revalidate }: { event: calendar_v3.Schema$Event; revalidate: () => void }) {
  return (
    <ActionPanel>
      {event.htmlLink && <Action.OpenInBrowser title="Open in Google Calendar" url={event.htmlLink} />}
      <ActionPanel.Section>
        {event.id && (
          <ActionPanel.Submenu
            icon={Icon.CheckCircle}
            title="Change Response Status"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          >
            {["accepted", "tentative", "declined"].map((status) => {
              const titles = {
                accepted: "Yes",
                tentative: "Maybe",
                declined: "No",
              };
              const messages = {
                accepted: "attending",
                tentative: "maybe",
                declined: "not attending",
              };
              const icon = {
                accepted: Icon.CheckCircle,
                tentative: Icon.CircleDisabled,
                declined: Icon.XMarkCircle,
              };

              // Find current user's response status
              const currentStatus = event.attendees?.find((attendee) => attendee.self)?.responseStatus;
              const isCurrentStatus = status === currentStatus;

              return (
                <Action
                  key={status}
                  title={titles[status as keyof typeof titles]}
                  icon={{
                    source: icon[status as keyof typeof icon],
                    tintColor: isCurrentStatus ? Color.Green : Color.PrimaryText,
                  }}
                  onAction={async () => {
                    const calendar = getCalendarClient();
                    try {
                      await showToast({ style: Toast.Style.Animated, title: "Changing response status" });
                      await calendar.events.patch({
                        calendarId: "primary",
                        eventId: event.id ?? undefined,
                        requestBody: {
                          attendees: event.attendees?.map((attendee) =>
                            attendee.self ? { ...attendee, responseStatus: status } : attendee,
                          ),
                        },
                      });
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Changed response status to ${messages[status as keyof typeof messages]}`,
                      });
                      await revalidate();
                    } catch (error) {
                      await showFailureToast(error, { title: "Failed changing response status" });
                    }
                  }}
                />
              );
            })}
          </ActionPanel.Submenu>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {event.htmlLink && (
          <Action.CopyToClipboard
            title="Copy Event Link"
            content={event.htmlLink}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        {event.summary && (
          <Action.CopyToClipboard
            title="Copy Event Title"
            content={event.summary}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
        {event.conferenceData?.entryPoints?.[0]?.uri && (
          <Action.CopyToClipboard
            title="Copy Meeting Link"
            content={event.conferenceData.entryPoints[0].uri}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {event.id && (
          <Action
            title="Delete Event"
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            onAction={async () => {
              const isConfirmed = await confirmAlert({
                title: "Delete Event",
                message: "Are you sure you want to delete this event?",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Event",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!isConfirmed) {
                return;
              }

              const calendar = getCalendarClient();

              try {
                await showToast({ style: Toast.Style.Animated, title: "Deleting event" });
                await calendar.events.delete({
                  calendarId: "primary",
                  eventId: event.id ?? undefined,
                });

                await showToast({ style: Toast.Style.Success, title: "Deleted event" });

                revalidate();
              } catch (error) {
                await showFailureToast(error, { title: "Failed to delete event" });
              }
            }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default withGoogleAPIs(Command);
