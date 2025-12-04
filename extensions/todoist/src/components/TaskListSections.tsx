import { List } from "@raycast/api";

import { SectionWithTasks } from "../helpers/groupBy";
import { ViewMode } from "../helpers/tasks";
import { QuickLinkView } from "../home";
import useCachedData from "../hooks/useCachedData";
import { ViewProps } from "../hooks/useViewTasks";

import TaskListItem from "./TaskListItem";

type TaskListProps = {
  sections: SectionWithTasks[];
  mode?: ViewMode;
  viewProps?: ViewProps;
  quickLinkView?: QuickLinkView;
};

export default function TaskListSections({ sections, mode = ViewMode.date, viewProps, quickLinkView }: TaskListProps) {
  const [data, setData] = useCachedData();

  return (
    <>
      {sections.map((section, index) => {
        const subtitle = `${section.tasks.length} ${section.tasks.length === 1 ? "task" : "tasks"}`;

        return (
          <List.Section title={section.name} subtitle={subtitle} key={index}>
            {section.tasks.map((task) => {
              return (
                <TaskListItem
                  key={task.id}
                  task={task}
                  mode={mode}
                  viewProps={viewProps}
                  data={data}
                  setData={setData}
                  quickLinkView={quickLinkView}
                />
              );
            })}
          </List.Section>
        );
      })}
    </>
  );
}
