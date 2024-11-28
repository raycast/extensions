import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getFilterTasks } from "../../src/api";
import { filterSort } from "../helpers/filters";
import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewActions from "./CreateViewActions";
import TaskListSections from "./TaskListSections";

type FilterTasksProps = { name: string; quickLinkView?: QuickLinkView };

function FilterTasks({ name, quickLinkView }: FilterTasksProps) {
  const [cachedData] = useCachedData();
  const filters = cachedData?.filters;
  const filter = filters?.find((filter: { name: string }) => filter.name === name);
  const query = filter?.query || "";

  const { data } = useCachedPromise(
    async (search) => {
      const filterTasks = await getFilterTasks(search);
      return filterSort(filterTasks);
    },
    [query],
  );

  const tasks = data ?? [];

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

            {quickLinkView ? (
              <ActionPanel.Section>
                <CreateViewActions {...quickLinkView} />
              </ActionPanel.Section>
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <TaskListSections
      mode={ViewMode.project}
      sections={viewProps.groupBy?.value === "default" ? [{ name, tasks: tasks }] : sections}
      viewProps={viewProps}
      quickLinkView={quickLinkView}
    />
  );
}

export default FilterTasks;
