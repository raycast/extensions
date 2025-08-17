import { useMemo } from "react";

import { groupByDates } from "../helpers/groupBy";
import { getTasksForTodayView } from "../helpers/tasks";
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

    return getTasksForTodayView(data.items, data.user.id);
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
