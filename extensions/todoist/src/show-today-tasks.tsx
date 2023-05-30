import { List } from "@raycast/api";
import { isBefore, isSameDay } from "date-fns";
import { useMemo } from "react";

import TaskListSections from "./components/TaskListSections";
import TodayEmptyView from "./components/TodayEmptyView";
import View from "./components/View";
import { getToday } from "./helpers/dates";
import { groupByDueDates } from "./helpers/groupBy";
import { getTasksForTodayOrUpcomingView, searchBarPlaceholder } from "./helpers/tasks";
import useSyncData from "./hooks/useSyncData";
import useViewTasks from "./hooks/useViewTasks";

function TodayTasks() {
  const { data, isLoading } = useSyncData();

  const tasks = useMemo(() => {
    if (!data) return [];

    return getTasksForTodayOrUpcomingView(data.items, data.user.id).filter((t) => {
      if (!t.due) return false;

      return isBefore(new Date(t.due.date), getToday()) || isSameDay(new Date(t.due.date), getToday());
    });
  }, [data]);

  let sections = [];

  const {
    sections: groupedSections,
    viewProps,
    sortedTasks,
  } = useViewTasks("todoist.today", { tasks, data, optionsToExclude: ["date"] });

  sections = viewProps.groupBy?.value === "default" ? groupByDueDates(sortedTasks) : groupedSections;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      <TaskListSections sections={sections} viewProps={viewProps} />
      <TodayEmptyView />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <TodayTasks />
    </View>
  );
}
