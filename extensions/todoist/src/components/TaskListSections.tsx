import { List } from "@raycast/api";

import { SectionWithTasks } from "../helpers/groupBy";
import { QuickLinkView, ViewMode } from "../home";
import { ViewProps } from "../hooks/useViewTasks";

import TaskListItem from "./TaskListItem";

type TaskListProps = {
  sections: SectionWithTasks[];
  isLoading?: boolean;
  mode?: ViewMode;
  viewProps?: ViewProps;
  quickLinkView?: QuickLinkView;
};

export default function TaskListSections({
  sections,
  mode = ViewMode.date,
  viewProps,
  quickLinkView,
}: TaskListProps): JSX.Element {
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
