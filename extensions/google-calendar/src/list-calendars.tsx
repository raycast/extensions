import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { withGoogleAPIs } from "./lib/google";
import useCalendars from "./hooks/useCalendars";
import { calendar_v3 } from "@googleapis/calendar";
import { showFailureToast } from "@raycast/utils";

const calendarItemAccessoiries = (calendar?: calendar_v3.Schema$CalendarListEntry) =>
  calendar &&
  [
    {
      icon: calendar.primary ? Icon.Star : undefined,
      tag: calendar.primary ? "Primary" : undefined,
    },
    {
      icon: calendar.selected ? Icon.Eye : Icon.EyeDisabled,
    },
    {
      tag: calendar.accessRole,
      icon: calendar.accessRole === "owner" ? Icon.Person : Icon.List,
    },
  ].filter((accessory) => accessory.icon || accessory.tag);

const CalendarActions = ({ calendar }: { calendar: calendar_v3.Schema$CalendarListEntry }) => {
  return (
    <ActionPanel>
      <Action
        title="Show Events"
        icon={Icon.List}
        onAction={async () => {
          try {
            await launchCommand({
              name: "list-events",
              type: LaunchType.UserInitiated,
              context: { calendarId: calendar.id },
            });
          } catch (error) {
            showFailureToast(error, {
              title: "Failed to show events",
            });
          }
        }}
      />
    </ActionPanel>
  );
};

function ListCalendars() {
  const { data, isLoading } = useCalendars();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Visible Calendars">
        {data.selected.map((calendar) => (
          <List.Item
            key={calendar.id}
            title={calendar.summaryOverride ?? calendar.summary ?? ""}
            subtitle={calendar.description ?? ""}
            icon={{ source: Icon.Calendar, tintColor: calendar.backgroundColor ?? undefined }}
            accessories={calendarItemAccessoiries(calendar)}
            actions={<CalendarActions calendar={calendar} />}
          />
        ))}
      </List.Section>

      <List.Section title="Hidden Calendars">
        {data.unselected.map((calendar) => (
          <List.Item
            key={calendar.id}
            title={calendar.summaryOverride ?? calendar.summary ?? ""}
            subtitle={calendar.description ?? ""}
            icon={{ source: Icon.Calendar, tintColor: calendar.backgroundColor ?? undefined }}
            accessories={calendarItemAccessoiries(calendar)}
            actions={<CalendarActions calendar={calendar} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

export default withGoogleAPIs(ListCalendars);
