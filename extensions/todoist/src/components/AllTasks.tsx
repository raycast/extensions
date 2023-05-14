import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import TaskListItem from "./TaskListItem";
import TaskListSections from "./TaskListSections";

type AllTasksProps = { quickLinkView: QuickLinkView };

export default function AllTasks({ quickLinkView }: AllTasksProps) {
  const [data] = useCachedData();

  const tasks = data?.items ?? [];

  const { sections, sortedTasks, viewProps } = useViewTasks("todoist.all", { tasks, data });

  if (viewProps.groupBy?.value === "default") {
    return (
      <>
        {sortedTasks.map((task) => {
          return (
            <TaskListItem
              key={task.id}
              task={task}
              mode={ViewMode.search}
              viewProps={viewProps}
              quickLinkView={quickLinkView}
            />
          );
        })}
      </>
    );
  }

  return <TaskListSections mode={ViewMode.search} sections={sections} viewProps={viewProps} />;
}
