import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { isPastDue, sortByDate, sortByLevel } from "./date";
import { useSearch } from "./hooks/useSearch";
import { getAllTags, retrieveAllItems } from "./storage";
import { TaskLineItem } from "./TaskLineItem";
import { Tag, Task } from "./types";
type SortOrder = "dueDate" | "level";
type Props = {
  initialSearchText?: string;
};

function categorizeTasks(unfilteredTasks: Task[], filteredTasks: Task[]) {
  type ExtendedTask = Task & {
    isFiltered: boolean;
  };
  const categorizedTasks = {
    outdatedTasks: [] as ExtendedTask[],
    pinnedTasks: [] as ExtendedTask[],
    incompleteTasks: [] as ExtendedTask[],
    completeTasks: [] as ExtendedTask[],
  };

  for (const task of unfilteredTasks) {
    const isFiltered = filteredTasks.some((t) => t.id === task.id);
    switch (true) {
      case task.completed:
        categorizedTasks.completeTasks.push({ ...task, isFiltered });
        break;
      case isPastDue(task.date):
        // outdated tasks are always visible
        categorizedTasks.outdatedTasks.push({ ...task, isFiltered: true });
        break;
      case task.pinned:
        categorizedTasks.pinnedTasks.push({ ...task, isFiltered });
        break;
      default:
        categorizedTasks.incompleteTasks.push({ ...task, isFiltered });
        break;
    }
  }

  return {
    outdatedTasks: categorizedTasks.outdatedTasks.filter((t) => t.isFiltered),
    pinnedTasks: categorizedTasks.pinnedTasks.filter((t) => t.isFiltered),
    incompleteTasks: categorizedTasks.incompleteTasks.filter((t) => t.isFiltered),
    completeTasks: categorizedTasks.completeTasks.filter((t) => t.isFiltered),
  };
}
const Command = ({ initialSearchText }: Props) => {
  const initialData = useMemo(() => {
    return [] as Task[];
  }, []);

  const {
    isLoading: isAllItemLoading,
    data: unfilteredTasks,
    revalidate: refetchList,
  } = useCachedPromise(retrieveAllItems, [], {
    initialData,
  });
  const { isLoading: isAllTagLoading, data: allTags } = useCachedPromise(getAllTags, [], {
    initialData: [] as Tag[],
  });

  const { searchText, setSearchText, filteredItems } = useSearch(unfilteredTasks, allTags, initialSearchText);

  const { outdatedTasks, pinnedTasks, incompleteTasks, completeTasks } = categorizeTasks(
    unfilteredTasks,
    filteredItems,
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("dueDate");
  const sortMethod = sortOrder === "dueDate" ? sortByDate : sortByLevel;

  return (
    <List
      isLoading={isAllItemLoading || isAllTagLoading}
      searchBarPlaceholder="Search by anything. Task title, tags, date, etc."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select sort order" onChange={(v: string) => setSortOrder(v as SortOrder)}>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Due date" value="dueDate" icon={Icon.Calendar} />
            <List.Dropdown.Item title="Level" value="level" icon={Icon.Cloud} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="⚠️ Outdated" subtitle={`${outdatedTasks.length} tasks`}>
        {outdatedTasks.sort(sortMethod).map((task) => (
          <TaskLineItem key={task.id} task={task} refetchList={refetchList} allTags={allTags} />
        ))}
      </List.Section>
      <List.Section title="📌Pinned" subtitle={`${pinnedTasks.length} tasks`}>
        {pinnedTasks.sort(sortMethod).map((task) => (
          <TaskLineItem key={task.id} task={task} refetchList={refetchList} allTags={allTags} />
        ))}
      </List.Section>
      <List.Section title="📝Incomplete" subtitle={`${incompleteTasks.length} tasks`}>
        {incompleteTasks.sort(sortMethod).map((task) => (
          <TaskLineItem key={task.id} task={task} refetchList={refetchList} allTags={allTags} />
        ))}
      </List.Section>
      <List.Section title="✅Done" subtitle={`${completeTasks.length} tasks`}>
        {completeTasks.sort(sortMethod).map((task) => (
          <TaskLineItem key={task.id} task={task} refetchList={refetchList} allTags={allTags} />
        ))}
      </List.Section>
    </List>
  );
};

export default Command;
