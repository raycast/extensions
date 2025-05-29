import { Action, ActionPanel, Alert, Color, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { getCalendarClient } from "../lib/google";
import { showFailureToast } from "@raycast/utils";
import { calendar_v3 } from "@googleapis/calendar";

const EventActions = ({
  event,
  revalidate,
  calendar,
}: {
  event: calendar_v3.Schema$Event;
  calendar: calendar_v3.Schema$CalendarListEntry | null;
  revalidate: () => void;
}) => {
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
                    const calendarClient = getCalendarClient();
                    try {
                      await showToast({ style: Toast.Style.Animated, title: "Changing response status" });
                      await calendarClient.events.patch({
                        calendarId: calendar?.id ?? "primary",
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
                      revalidate();
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
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

              const calendarClient = getCalendarClient();

              try {
                await showToast({ style: Toast.Style.Animated, title: "Deleting event" });
                await calendarClient.events.delete({
                  calendarId: calendar?.id ?? "primary",
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
};

export default EventActions;
