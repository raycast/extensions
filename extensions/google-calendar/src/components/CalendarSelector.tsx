import { Icon, List } from "@raycast/api";
import { UseCalendarsData } from "../hooks/useCalendars";
import { BIRTHDAYS_VIEW_CALENDAR_ID, isContactsBirthdaysCalendar } from "../lib/event-types";

const CalendarSelector = ({
  calendars,
  onCalendarChange,
  storeValue,
  defaultValue,
}: {
  calendars: UseCalendarsData;
  onCalendarChange: (calendarId: string | null) => void;
  storeValue?: boolean;
  defaultValue?: string;
}) => {
  const visibleCalendars = calendars.selected.filter((calendar) => !isContactsBirthdaysCalendar(calendar.id));
  const hiddenCalendars = calendars.unselected.filter((calendar) => !isContactsBirthdaysCalendar(calendar.id));

  return (
    <List.Dropdown
      tooltip="Select Calendar"
      onChange={onCalendarChange}
      storeValue={storeValue}
      defaultValue={defaultValue}
    >
      <List.Dropdown.Section title="Visible Calendars">
        {visibleCalendars.map((calendar) => (
          <List.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendar.summaryOverride ?? calendar.summary ?? "(Untitled Calendar)"}
          />
        ))}
        <List.Dropdown.Item value={BIRTHDAYS_VIEW_CALENDAR_ID} title="Birthdays" icon={Icon.Gift} />
      </List.Dropdown.Section>
      {hiddenCalendars.length > 0 && (
        <List.Dropdown.Section title="Hidden Calendars">
          {hiddenCalendars.map((calendar) => (
            <List.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendar.summaryOverride ?? calendar.summary ?? "(Untitled Calendar)"}
            />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
};

export default CalendarSelector;
