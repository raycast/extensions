import { Color, Icon, List } from "@raycast/api";
import React from "react";
import { DateFilterPreset, TweekCalendar, TweekCustomColor } from "../types";
import { BUILT_IN_COLORS } from "../utils/format-task";

export interface CalendarSelectorProps {
  calendars: TweekCalendar[];
  activeCalendarId: string;
  datePreset: DateFilterPreset;
  colorFilter: string;
  somedayListId: string;
  customColors: TweekCustomColor[];
  onSelectCalendar: (calendarId: string) => void;
  onSelectDatePreset: (preset: DateFilterPreset) => void;
  onSelectColorFilter: (colorId: string) => void;
  onSelectSomedayList: (listId: string) => void;
}

export function CalendarSelector({
  calendars,
  activeCalendarId,
  datePreset,
  colorFilter,
  somedayListId,
  customColors,
  onSelectCalendar,
  onSelectDatePreset,
  onSelectColorFilter,
  onSelectSomedayList,
}: CalendarSelectorProps) {
  const activeCalendar = calendars.find((c) => c.id === activeCalendarId);

  const currentCompositeValue = (() => {
    if (somedayListId !== "all") return `list:${somedayListId}`;
    if (colorFilter !== "all") return `color:${colorFilter}`;
    if (datePreset !== "all") return `preset:${datePreset}`;
    return `cal:${activeCalendarId}`;
  })();

  const handleChange = (val: string) => {
    if (val.startsWith("cal:")) {
      const calId = val.slice(4);
      onSelectSomedayList("all");
      onSelectColorFilter("all");
      onSelectDatePreset("all");
      onSelectCalendar(calId);
    } else if (val.startsWith("preset:")) {
      const preset = val.slice(7) as DateFilterPreset;
      onSelectSomedayList("all");
      onSelectDatePreset(preset);
    } else if (val.startsWith("color:")) {
      const col = val.slice(6);
      onSelectColorFilter(col);
    } else if (val.startsWith("list:")) {
      const listId = val.slice(5);
      onSelectDatePreset("someday");
      onSelectSomedayList(listId);
    }
  };

  return (
    <List.Dropdown
      tooltip="Switch Calendar or Filter Tasks"
      value={currentCompositeValue}
      onChange={handleChange}
    >
      <List.Dropdown.Section title="Calendars">
        {calendars.map((cal) => (
          <List.Dropdown.Item
            key={`cal:${cal.id}`}
            value={`cal:${cal.id}`}
            title={`${cal.name}${cal.isDefault ? " (Default)" : ""}`}
            icon={{
              source:
                cal.id === activeCalendarId ? Icon.CheckCircle : Icon.Calendar,
              tintColor:
                cal.id === activeCalendarId ? Color.Green : Color.PrimaryText,
            }}
          />
        ))}
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Date Filter">
        <List.Dropdown.Item
          value="preset:all"
          title="Dashboard (Today + This Week)"
          icon={Icon.AppWindowGrid3x3}
        />
        <List.Dropdown.Item
          value="preset:today"
          title="Today Only"
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
        />
        <List.Dropdown.Item
          value="preset:this_week"
          title="This Week"
          icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
        />
        <List.Dropdown.Item
          value="preset:overdue"
          title="Overdue Tasks"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
        <List.Dropdown.Item
          value="preset:someday"
          title="Someday Lists (Undated)"
          icon={{ source: Icon.Tray, tintColor: Color.Purple }}
        />
      </List.Dropdown.Section>

      {activeCalendar &&
        activeCalendar.lists &&
        activeCalendar.lists.length > 0 && (
          <List.Dropdown.Section
            title={`${activeCalendar.name} — Someday Lists`}
          >
            {activeCalendar.lists
              .filter((l) => !l.hidden && !l.webHidden)
              .map((list) => (
                <List.Dropdown.Item
                  key={`list:${list.id}`}
                  value={`list:${list.id}`}
                  title={`List: ${list.name}`}
                  icon={Icon.List}
                />
              ))}
          </List.Dropdown.Section>
        )}

      <List.Dropdown.Section title="Filter by Color Badge">
        <List.Dropdown.Item
          value="color:all"
          title="All Colors"
          icon={Icon.Tag}
        />
        {Object.values(BUILT_IN_COLORS)
          .filter((c) => c.id !== "blank")
          .map((c) => (
            <List.Dropdown.Item
              key={`color:${c.id}`}
              value={`color:${c.id}`}
              title={`Color: ${c.label}`}
              icon={{ source: Icon.CircleFilled, tintColor: c.raycastColor }}
            />
          ))}
        {customColors.map((custom) => (
          <List.Dropdown.Item
            key={`color:${custom.id}`}
            value={`color:${custom.id}`}
            title={`Custom: ${custom.name || custom.backgroundColor}`}
            icon={{
              source: Icon.CircleFilled,
              tintColor: custom.backgroundColor,
            }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
