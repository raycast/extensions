import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

import { Task, getFilterTasks } from "../../src/api";
import { filterSort } from "../helpers/filters";
import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewAction from "./CreateViewAction";
import TaskListSections from "./TaskListSections";

type FilterTasksProps = { name: string; quickLinkView?: QuickLinkView };

function FilterTasks({ name, quickLinkView }: FilterTasksProps) {
  const [data] = useCachedData();
  const filters = data?.filters;
  const filter = filters?.find((filter) => filter.name === name);
  const query = filter?.query || "";
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (query) {
      getFilterTasks(query)
        .then((fetchedTasks) => {
          setTasks(filterSort(fetchedTasks));
        })
        .catch(() => {
          throw new Error("Error fetching filter tasks");
        });
    } else {
      setTasks([]);
    }
  }, [query]);

  const { sections, viewProps, sortedTasks } = useViewTasks(`todoist.filter${name}`, { tasks, data });

  if (tasks.length === 0) {
    return (
      <List.EmptyView
        title="No tasks for this filter."
        description="How about adding one?"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              icon={Icon.Plus}
              target={""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />

            {quickLinkView ? <CreateViewAction {...quickLinkView} /> : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <TaskListSections
      mode={ViewMode.project}
      sections={viewProps.groupBy?.value === "default" ? [{ name, tasks: sortedTasks }] : sections}
      viewProps={viewProps}
      quickLinkView={quickLinkView}
    />
  );
}

export default FilterTasks;
