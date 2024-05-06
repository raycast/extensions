import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { Calendar } from "../types/calendar";
import { Events } from "./Events";

interface CalendarsListProps {
  calendars: Calendar[];
  isLoading: boolean;
}

export const CalendarsList: React.FC<CalendarsListProps> = ({ calendars, isLoading }) => {
  const { push } = useNavigation();

  const handleViewEvents = (calendar: Calendar) => {
    const calendarId = calendar.id;
    if (!calendarId) return;
    push(<Events calendarId={calendarId} />);
  };

  return (
    <List isLoading={isLoading}>
      {calendars.map((calendar) => (
        <List.Item
          icon="google-calendar.png"
          key={calendar?.id}
          title={calendar?.summary}
          subtitle={calendar?.description}
          actions={
            <ActionPanel>
              <Action title="View Events" onAction={() => handleViewEvents(calendar)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
