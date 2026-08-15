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

  const { sections: groupedSections, viewProps } = useViewTasks("todoist.today", {
    tasks,
    data,
    optionsToExclude: ["date"],
  });

  // Handle the date grouping case specially to ensure we only use our filtered tasks
  if (viewProps.groupBy?.value === "date" || viewProps.groupBy?.value === "default") {
    sections = groupByDates(tasks);
  } else {
    sections = groupedSections;
  }

  if (tasks.length === 0) {
    return <TodayEmptyView quickLinkView={quickLinkView} />;
  }

  return <TaskListSections sections={sections} viewProps={viewProps} quickLinkView={quickLinkView} />;
}
