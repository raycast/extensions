import { isBefore, isSameDay } from "date-fns";
import { useMemo } from "react";

import { getToday } from "../helpers/dates";
import { groupByDates } from "../helpers/groupBy";
import { getTasksForTodayOrUpcomingView } from "../helpers/tasks";
import { QuickLinkView } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import TaskListSections from "./TaskListSections";
import TodayEmptyView from "./TodayEmptyView";

type TodayTasksProps = { quickLinkView: QuickLinkView };

export default function TodayTasks({ quickLinkView }: TodayTasksProps) {
  const [data] = useCachedData();

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

  sections = viewProps.groupBy?.value === "default" ? groupByDates(sortedTasks) : groupedSections;

  if (tasks.length === 0) {
    return <TodayEmptyView quickLinkView={quickLinkView} />;
  }

  return <TaskListSections sections={sections} viewProps={viewProps} quickLinkView={quickLinkView} />;
}
