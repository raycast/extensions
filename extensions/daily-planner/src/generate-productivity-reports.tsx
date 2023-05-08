import { getPreferenceValues } from "@raycast/api";
import { isSameDay } from "date-fns";
import { useState } from "react";
import { activeSourceIds } from "./api/todo-source";
import ReportingPeriodDropdown, { initialReportingPeriod } from "./components/ReportingPeriodDropdown";
import ReportList from "./components/ReportList";
import ScopedPermissionView from "./components/ScopedPermissionView";
import { showErrorToast } from "./helpers/errors";
import {
  buildReport,
  reportGroupKey,
  ReportGroupKey,
  ReportItemSortDescriptor,
  reportItemSortDescriptor,
} from "./helpers/report";
import useEvents from "./hooks/useEvents";
import useTimeEntries from "./hooks/useTimeEntries";
import useTodoGroups from "./hooks/useTodoGroups";
import useTodos from "./hooks/useTodos";
import useTodoTags from "./hooks/useTodoTags";
import { CalendarEventForReport } from "./types";

interface Preferences {
  blockCalendar: string;
  eventCalendars: string;
  timeTrackingApp: string;
  timeEntryCalendar: string | undefined; // optional
  excludeWeekends: boolean;
  showUnscheduledOpenTodos: boolean;
  groupBySpontaneity: boolean;
}

const {
  blockCalendar,
  eventCalendars,
  timeTrackingApp,
  timeEntryCalendar,
  excludeWeekends,
  showUnscheduledOpenTodos,
  groupBySpontaneity,
} = getPreferenceValues<Preferences>();

const calendarNames = eventCalendars ? [blockCalendar, ...eventCalendars.split(",")] : [blockCalendar];

export default function Command() {
  const [reportingPeriod, setReportingPeriod] = useState(initialReportingPeriod);
  const [groupKeys, setGroupKeys] = useState<ReportGroupKey[]>([reportGroupKey.itemStatus, reportGroupKey.taskBlock]);
  const availableGroupKeys = Object.values(reportGroupKey).filter((key) => !groupKeys.includes(key));
  const [showingGroupsAsItems, setShowingGroupsAsItems] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<ReportItemSortDescriptor>(
    reportItemSortDescriptor.todoTimestamp
  );

  const { interval } = reportingPeriod;
  const { todos, todosError, isLoadingTodos, revalidateTodos, permissionView } = useTodos({ interval });
  const { todoGroups, tieredTodoGroups, isLoadingTodoGroups, revalidateTodoGroups } = useTodoGroups();
  const { todoTags, isLoadingTodoTags, revalidateTodoTags } = useTodoTags();
  const [isLoadingEvents, events, revalidateEvents] = useEvents<CalendarEventForReport>({
    calendars: calendarNames,
    interval,
    forReport: true,
  });
  const { timeEntries, isLoadingTimeEntries, timeEntriesError, revalidateTimeEntries } = useTimeEntries(
    timeTrackingApp,
    {
      from: new Date(interval.start),
      to: new Date(interval.end),
      calendarName: timeEntryCalendar,
    }
  );

  if (permissionView) {
    return <ScopedPermissionView scope="Reminders" />;
  }

  if (todosError) {
    void showErrorToast("Unable to fetch to-dos", todosError);
  }

  if (timeEntriesError) {
    void showErrorToast("Unable to fetch time entries", timeEntriesError);
  }

  const report = buildReport(todos, todoGroups, todoTags, events, timeEntries, {
    groupKeys,
    excludeWeekends,
    showUnscheduledOpenTodos,
    groupBySpontaneity,
    groupByTodoStatus: true,
    sortDescriptor,
  });

  return (
    <ReportList
      reportItem={report}
      isLoading={
        isLoadingTodos ||
        (groupKeys.includes(reportGroupKey.todoGroup) && isLoadingTodoGroups) ||
        (groupKeys.includes(reportGroupKey.tag) && isLoadingTodoTags) ||
        isLoadingEvents ||
        isLoadingTimeEntries
      }
      tieredTodoGroups={tieredTodoGroups}
      todoTags={todoTags}
      isSingleDayReport={isSameDay(interval.start, interval.end)}
      groupKeys={groupKeys}
      availableGroupKeys={availableGroupKeys}
      setGroupKeys={setGroupKeys}
      showingGroupsAsItems={showingGroupsAsItems}
      setShowingGroupsAsItems={setShowingGroupsAsItems}
      sortDescriptor={sortDescriptor}
      setSortDescriptor={setSortDescriptor}
      reportingPeriodDropdown={
        <ReportingPeriodDropdown reportingPeriod={reportingPeriod} setReportingPeriod={setReportingPeriod} />
      }
      showSourceIcon={activeSourceIds.length > 1}
      refresh={() =>
        Promise.all([
          revalidateTodos(),
          revalidateTodoTags(),
          revalidateTodoGroups(),
          revalidateEvents(),
          revalidateTimeEntries ? revalidateTimeEntries() : Promise.resolve(),
        ])
      }
    />
  );
}
