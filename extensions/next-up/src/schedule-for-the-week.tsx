import { List, Icon, ActionPanel, Action, Color, launchCommand, LaunchType } from "@raycast/api";
import { useState } from "react";
import { useAppData } from "./lib/hooks/useAppData";
import { getSchedulesForDay, getTodayName } from "./lib/schedule-utils";
import { DAYS_OF_WEEK } from "./lib/constants";
import { CourseListItem } from "./lib/components/CourseListItem";
import { NoScheduleEmptyView } from "./lib/components/NoScheduleEmptyView";
import type { DayOfWeek } from "./lib/types";

export default function ScheduleForTheWeek() {
  const { activeGroup, isLoading } = useAppData();
  const today = getTodayName();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayName());

  const courses = activeGroup?.courses ?? [];

  function handleManage() {
    launchCommand({ name: "manage-schedules", type: LaunchType.UserInitiated });
  }

  const occurrences = getSchedulesForDay(courses, selectedDay);
  const isToday = selectedDay === today;

  const listActions = (
    <ActionPanel>
      <Action
        title="Manage Schedules"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        onAction={handleManage}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Day"
          value={selectedDay}
          onChange={(value) => setSelectedDay(value as DayOfWeek)}
        >
          {DAYS_OF_WEEK.map((day) => (
            <List.Dropdown.Item
              key={day}
              title={day}
              value={day}
              icon={day === today ? { source: Icon.Star, tintColor: Color.Yellow } : undefined}
            />
          ))}
        </List.Dropdown>
      }
      actions={listActions}
    >
      {courses.length === 0 && !isLoading ? (
        <NoScheduleEmptyView />
      ) : occurrences.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title={`No Classes on ${selectedDay}`}
          description={isToday ? "Enjoy your free day!" : "No courses scheduled for this day."}
          actions={listActions}
        />
      ) : (
        <List.Section title={selectedDay} subtitle={isToday ? "Today" : undefined}>
          {occurrences.map((occ) => (
            <CourseListItem key={`${occ.course.id}-${occ.slot.id}`} occurrence={occ} onManage={handleManage} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
