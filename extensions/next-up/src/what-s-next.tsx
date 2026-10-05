import { List, Icon, Action, ActionPanel, launchCommand, LaunchType } from "@raycast/api";
import { useAppData } from "./lib/hooks/useAppData";
import { getSchedulesForDay, getTodayName, getNextSchedule } from "./lib/schedule-utils";
import { CourseListItem } from "./lib/components/CourseListItem";
import { NoScheduleEmptyView } from "./lib/components/NoScheduleEmptyView";

export default function WhatSNext() {
  const { activeGroup, isLoading } = useAppData();

  const today = getTodayName();
  const courses = activeGroup?.courses ?? [];
  const todaySchedules = getSchedulesForDay(courses, today);
  const nextUp = getNextSchedule(courses);

  function handleManage() {
    launchCommand({ name: "manage-schedules", type: LaunchType.UserInitiated });
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Manage Schedules"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={handleManage}
          />
        </ActionPanel>
      }
    >
      {nextUp && (
        <List.Section title="Up Next">
          <CourseListItem occurrence={nextUp} onManage={handleManage} />
        </List.Section>
      )}
      {courses.length === 0 && !isLoading ? (
        <NoScheduleEmptyView />
      ) : (
        <List.Section title={`All of ${today}`}>
          {todaySchedules.map((occ) => (
            <CourseListItem key={`${occ.course.id}-${occ.slot.id}`} occurrence={occ} onManage={handleManage} />
          ))}
        </List.Section>
      )}
      {courses.length > 0 && todaySchedules.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.CheckCircle} title="Nothing Scheduled Today" description="Enjoy your free day!" />
      )}
    </List>
  );
}
