import { getFriendlyName } from "@lib/utils";
import { List, Icon } from "@raycast/api";
import { CalendarState } from "./utils";

export interface CalendarListDropdownProps extends Omit<List.Dropdown.Props, "tooltip"> {
  calendars: CalendarState[] | undefined;
}

export function CalendarListDropdown({ calendars, ...restProps }: CalendarListDropdownProps) {
  return (
    <List.Dropdown tooltip="Calendars" {...restProps}>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="All" value="" icon={Icon.Calendar} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Calendars">
        {calendars?.map((c) => (
          <List.Dropdown.Item
            key={c.entity_id}
            title={getFriendlyName(c)}
            value={c.entity_id}
            icon={{ source: Icon.Calendar, tintColor: c.color }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
