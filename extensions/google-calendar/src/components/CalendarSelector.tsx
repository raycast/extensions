import { List } from "@raycast/api";
import { UseCalendarsData } from "../hooks/useCalendars";
import { ALL_CALENDARS } from "../lib/utils";

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
  return (
    <List.Dropdown
      tooltip="Select Calendar"
      onChange={onCalendarChange}
      storeValue={storeValue}
      defaultValue={defaultValue}
    >
      <List.Dropdown.Section title="Visible Calendars">
        <List.Dropdown.Item value={ALL_CALENDARS} title="All" />
        {calendars.selected.map((calendar) => (
          <List.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendar.summaryOverride ?? calendar.summary ?? "(Untitled Calendar)"}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Hidden Calendars">
        {calendars.unselected.map((calendar) => (
          <List.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendar.summaryOverride ?? calendar.summary ?? "(Untitled Calendar)"}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default CalendarSelector;
