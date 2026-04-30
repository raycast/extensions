import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getFilterTasks, type Task } from "../api";
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
      const queries = search
        .split(",")
        .map((part: string) => part.trim())
        .filter((q: string) => q.length > 0);
      const sections = await Promise.all(
        queries.map(async (q: string) => {
          const tasks = await getFilterTasks(q);
          const sortedTasks = filterSort(tasks);
          return { name: q, tasks: sortedTasks };
        }),
      );
      return sections;
    },
    [query],
  );

  const sections = data ?? [];
  const tasks = sections.flatMap((section) => section.tasks);

  const {
    sections: groupedSections,
    sortedTasks,
    viewProps,
  } = useViewTasks(`todoist.filter${name}`, {
    tasks,
    data: cachedData,
  });

  if (sections.length === 0) {
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

  const displayedSections =
    viewProps.groupBy?.value !== "default"
      ? groupedSections
      : sections.length > 1
        ? sections.map((s) => {
            const idSet = new Set(s.tasks.map((t: Task) => t.id));
            return { name: s.name, tasks: sortedTasks.filter((t: Task) => idSet.has(t.id)) };
          })
        : [{ name, tasks: sortedTasks }];

  return (
    <TaskListSections
      mode={ViewMode.project}
      sections={displayedSections}
      viewProps={viewProps}
      quickLinkView={quickLinkView}
    />
  );
}

export default FilterTasks;
