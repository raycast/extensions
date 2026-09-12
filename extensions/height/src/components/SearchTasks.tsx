import { Color, environment, Icon, List } from "@raycast/api";
import { differenceInCalendarDays, format } from "date-fns";
import { useEffect, useState } from "react";

import ActionsTask from "@/components/ActionsTask";
import useFieldTemplates from "@/hooks/useFieldTemplates";
import useLists from "@/hooks/useLists";
import useTasks from "@/hooks/useTasks";
import useUsers from "@/hooks/useUsers";
import useWorkspace from "@/hooks/useWorkspace";
import { ListObject } from "@/types/list";
import { TaskObject } from "@/types/task";
import { UserObject } from "@/types/user";
import { getListById, getTintColorFromHue, ListColors } from "@/utils/list";
import { getAssignedUsers, getAssigneeFullNameById, getIconByStatusState, getPriorityIcon } from "@/utils/task";

type Props = {
  listId?: string;
  assignedTasks?: boolean;
};

export default function SearchTasks({ listId, assignedTasks }: Props = {}) {
  const { appearance } = environment;

  const [searchText, setSearchText] = useState<string>("");
  const [list, setList] = useState("all");
  const [assigneeId, setAssigneeId] = useState(assignedTasks ? "all" : undefined);
  const [filteredTasks, filterTasks] = useState<TaskObject[]>([]);

  const { lists, smartLists, listsIsLoading } = useLists({
    options: {
      execute: !listId,
    },
  });

  const {
    fieldTemplatesStatuses,
    fieldTemplatesPrioritiesObj,
    fieldTemplatesPriorities,
    fieldTemplatesDueDate,
    fieldTemplatesIsLoading,
  } = useFieldTemplates();
  const { users, usersIsLoading } = useUsers();
  const { workspaceData, workspaceIsLoading } = useWorkspace();
  const { tasks, tasksMutate, tasksIsLoading } = useTasks({ listId, assigneeId });

  useEffect(() => {
    if (!tasks) return;

    filterTasks(
      tasks.filter(
        (task) =>
          task?.name?.toLowerCase().includes(searchText?.toLowerCase()) &&
          (list === "all" || task?.listIds?.includes(list)),
      ) ?? [],
    );
  }, [searchText, tasks, list]);

  return (
    <List
      isLoading={
        fieldTemplatesIsLoading || (!listId && listsIsLoading) || usersIsLoading || workspaceIsLoading || tasksIsLoading
      }
      onSearchTextChange={setSearchText}
      navigationTitle={
        listId
          ? `${getListById(listId, lists, smartLists)?.name} – Tasks`
          : assignedTasks
            ? `${getAssigneeFullNameById(assigneeId, users)} – Tasks`
            : "Search Tasks"
      }
      searchBarPlaceholder="Search your tasks"
      searchBarAccessory={
        listId
          ? undefined
          : assignedTasks
            ? assignedDropdownAccessory(users, setAssigneeId, appearance)
            : listDropdownAccessory(lists, smartLists, setList)
      }
    >
      {fieldTemplatesStatuses?.map((status) => (
        <List.Section key={status.id} title={status.value}>
          {filteredTasks
            .filter((filteredTask) => filteredTask.status === status.id)
            .map((task) => (
              <List.Item
                key={task.id}
                title={task.name}
                subtitle={task.url.split("/").at(-1)}
                icon={{
                  source: getIconByStatusState(task.status, fieldTemplatesStatuses),
                  tintColor: `hsl(${status?.hue ?? "0"}, 80%, ${
                    typeof status?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                  })`,
                }}
                accessories={[
                  getTaskDueDateAccessory(task),
                  getTaskPriorityAccessory(task, appearance),
                  ...getAssignedUsers(task.assigneesIds, users),
                ]}
                actions={
                  <ActionsTask
                    task={task}
                    mutateTask={tasksMutate}
                    fieldTemplatesStatuses={fieldTemplatesStatuses}
                    fieldTemplatesPriorities={fieldTemplatesPriorities}
                    fieldTemplatesPrioritiesObj={fieldTemplatesPrioritiesObj}
                    fieldTemplatesDueDate={fieldTemplatesDueDate}
                    lists={lists}
                    tasks={tasks}
                    users={users}
                    workspace={workspaceData}
                  />
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function getTaskDueDateAccessory(task: TaskObject) {
  const foundDueDate = task.fields.find((field) => field?.name?.toLowerCase() === "due date");
  if (!foundDueDate || !foundDueDate.date) return {};
  const dueDate = new Date(foundDueDate.date);
  const today = new Date();

  return {
    icon: {
      source: Icon.Calendar,
      tintColor:
        differenceInCalendarDays(dueDate, today) <= 0 && !task.completed
          ? Color.Red
          : differenceInCalendarDays(dueDate, today) <= 2 && !task.completed
            ? Color.Yellow
            : Color.PrimaryText,
    },
    text: {
      color:
        differenceInCalendarDays(dueDate, today) <= 0 && !task.completed
          ? Color.Red
          : differenceInCalendarDays(dueDate, today) <= 2 && !task.completed
            ? Color.Yellow
            : Color.PrimaryText,
      value: format(new Date(foundDueDate.date), "MMM dd"),
    },
  };
}

function getTaskPriorityAccessory(task: TaskObject, appearance: string) {
  if (task.completed) return {};
  const foundPriority = task.fields.find((field) => field?.name?.toLowerCase() === "priority");
  if (!foundPriority) return {};
  return {
    icon: {
      source: getPriorityIcon(foundPriority.selectValue?.value),
      tintColor: `hsl(${foundPriority.selectValue?.hue ?? "0"}, 80%, ${
        typeof foundPriority.selectValue?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
      })`,
    },
    tooltip: `Priority: ${foundPriority.selectValue?.value}`,
  };
}

function assignedDropdownAccessory(
  users: UserObject[] | undefined,
  setAssigneeId: React.Dispatch<React.SetStateAction<string | undefined>>,
  appearance: string,
) {
  return (
    <List.Dropdown
      tooltip="Select User"
      storeValue={true}
      onChange={(newValue) => {
        setAssigneeId(newValue);
      }}
    >
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Section title="Users">
        {users?.map((user) => assignedDropdownItem(user, appearance))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function assignedDropdownItem(user: UserObject, appearance: string): JSX.Element {
  return (
    <List.Dropdown.Item
      key={user.id}
      title={`${user.firstname} ${user.lastname}`}
      icon={{
        source: user?.pictureUrl ?? Icon.Person,
        tintColor: user?.pictureUrl
          ? undefined
          : `hsl(${user?.hue ?? "0"}, 80%, ${typeof user?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"})`,
      }}
      value={user.id}
    />
  );
}

function listDropdownAccessory(
  lists: ListObject[] | undefined,
  smartLists: ListObject[] | undefined,
  setList: React.Dispatch<React.SetStateAction<string>>,
) {
  return (
    <List.Dropdown
      tooltip="Select List"
      storeValue={true}
      onChange={(newValue) => {
        setList(newValue);
      }}
    >
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Section title="Lists">{lists?.map((list) => listDropdownItem(list))}</List.Dropdown.Section>
      <List.Dropdown.Section title="Smart Lists">
        {smartLists?.map((smartList) => listDropdownItem(smartList))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function listDropdownItem(list: ListObject): JSX.Element {
  return (
    <List.Dropdown.Item
      key={list.id}
      title={list.name}
      icon={{
        source: list.appearance?.iconUrl ?? "list-icons/list.svg",
        tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
      }}
      value={list.id}
    />
  );
}
