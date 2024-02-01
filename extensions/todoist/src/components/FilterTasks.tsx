import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
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
  const [cachedData] = useCachedData();
  const filters = cachedData?.filters;
  const filter = filters?.find((filter: { name: string }) => filter.name === name);
  const query = filter?.query || "";
  const [tasks, setTasks] = useState<Task[]>([]);

  const getFilterTasksCached = async (query: string) => {
    const filterTasks = await getFilterTasks(query);
    return filterTasks;
  };

  const { isLoading, data } = useCachedPromise(getFilterTasksCached, [query]);

  useEffect(() => {
    if (data) {
      setTasks(filterSort(data));
    }
  }, [data]);

  const { sections, viewProps } = useViewTasks(`todoist.filter${name}`, { tasks });

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
      isLoading={isLoading}
      mode={ViewMode.project}
      sections={viewProps.groupBy?.value === "default" ? [{ name, tasks: tasks }] : sections}
      viewProps={viewProps}
      quickLinkView={quickLinkView}
    />
  );
}

export default FilterTasks;
