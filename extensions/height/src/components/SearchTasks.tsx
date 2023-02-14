import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { differenceInCalendarDays, format } from "date-fns";
import { useEffect, useState } from "react";
import useFieldTemplates from "../hooks/useFieldTemplates";
import useLists from "../hooks/useLists";
import useTasks from "../hooks/useTasks";
import useUsers from "../hooks/useUsers";
import { ListObject } from "../types/list";
import { TaskObject } from "../types/task";
import { UserObject } from "../types/user";
import { getListById, getTintColorFromHue, ListColors } from "../utils/list";
import { getAssignedUsers, getAssigneeFullNameById, getIconByStatusState, getPriorityIcon } from "../utils/task";
import UpdateTask from "./UpdateTask";

type Props = {
  listId?: string;
  assignedTasks?: boolean;
};

export default function SearchTasks({ listId, assignedTasks }: Props = {}) {
  const { push } = useNavigation();
  const { theme } = environment;

  const [searchText, setSearchText] = useState<string>("");
  const [list, setList] = useState("all");
  const [assigneeId, setAssigneeId] = useState(assignedTasks ? "all" : undefined);
  const [filteredTasks, filterTasks] = useState<TaskObject[]>([]);

  const { lists, smartLists, listsIsLoading } = useLists({
    options: {
      execute: !listId,
    },
  });

  const { fieldTemplatesStatuses, fieldTemplatesIsLoading } = useFieldTemplates();
  const { users, usersIsLoading } = useUsers();
  const { tasks, tasksIsLoading, tasksMutate } = useTasks({ listId, assigneeId });

  useEffect(() => {
    if (!tasks) return;
    filterTasks(
      tasks.filter(
        (item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) && (list === "all" || item.listIds.includes(list))
      )
    );
  }, [searchText, tasks, list]);

  return (
    <List
      isLoading={fieldTemplatesIsLoading || (!listId && listsIsLoading) || usersIsLoading || tasksIsLoading}
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
          ? assignedDropdownAccessory(users, setAssigneeId, theme)
          : listDropdownAccessory(lists, smartLists, setList, theme)
      }
    >
      {fieldTemplatesStatuses?.map((status) => (
        <List.Section key={status.id} title={status.value}>
          {filteredTasks
            .filter((task) => task.status === status.id)
            .map((item) => (
              <List.Item
                key={item.id}
                title={item.name}
                subtitle={item.url.split("/").at(-1)}
                icon={{
                  source: getIconByStatusState(item.status, fieldTemplatesStatuses),
                  tintColor: `hsl(${status?.hue ?? "0"}, 80%, ${
                    typeof status?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
                  })`,
                }}
                accessories={[
                  getTaskDueDateAccessory(item),
                  getTaskPriorityAccessory(item),
                  ...getAssignedUsers(item.assigneesIds, users),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Mark as completed"
                        icon={Icon.List}
                        onAction={async () => await Clipboard.copy(JSON.stringify(item, null, 2))}
                      />
                      <Action.OpenInBrowser title="Open Task in Browser" url={item.url} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Create Task"
                        icon={Icon.NewDocument}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={async () => {
                          await launchCommand({ name: "create_task", type: LaunchType.UserInitiated });
                        }}
                      />
                      <Action
                        title="Edit Task"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => push(<UpdateTask task={item} mutateTask={tasksMutate} />)}
                      />
                      <Action
                        title="Assign To"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        onAction={async () => await showHUD("Assign To Action")}
                      />
                      <Action
                        title="Set Status"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onAction={async () => await showHUD("Set Status Action")}
                      />
                      <Action
                        title="Set Priority"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        onAction={async () => await showHUD("Set Priority Action")}
                      />
                      <Action
                        title="Set Due Date"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={async () => await showHUD("Set Due Date Action")}
                      />
                      <Action
                        title="Set Parent Task"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["opt", "shift"], key: "p" }}
                        onAction={async () => await showHUD("Set Parent Task Action")}
                      />
                      <Action
                        title="Move To List"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                        onAction={async () => await showHUD("Move To List Action")}
                      />
                      <Action
                        title="Delete Task"
                        icon={Icon.Pencil}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={async () => await showHUD("Delete Task Action")}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Task ID"
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                        icon={Icon.CopyClipboard}
                        content={item.url.split("/").at(-1) ?? ""}
                      />
                      <Action.CopyToClipboard
                        title="Copy Task Name"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                        icon={Icon.CopyClipboard}
                        content={item.name}
                      />
                      <Action.CopyToClipboard
                        title="Copy Task URL"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                        icon={Icon.CopyClipboard}
                        content={item.url}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function getTaskDueDateAccessory(task: TaskObject) {
  if (task.completed) return {};
  const foundDueDate = task.fields.find((field) => field.name.toLowerCase() === "due date");
  if (!foundDueDate || !foundDueDate.date) return {};
  const dueDate = new Date(foundDueDate.date);
  const today = new Date();

  return {
    text: {
      color:
        differenceInCalendarDays(dueDate, today) <= 0
          ? Color.Red
          : differenceInCalendarDays(dueDate, today) <= 2
          ? Color.Yellow
          : Color.PrimaryText,
      value: format(new Date(foundDueDate.date), "MMM dd"),
    },
  };
}

function getTaskPriorityAccessory(task: TaskObject) {
  if (task.completed) return {};
  const foundPriority = task.fields.find((field) => field.name.toLowerCase() === "priority");
  if (!foundPriority) return {};
  return {
    icon: {
      source: getPriorityIcon(foundPriority.selectValue?.value),
      tintColor: `hsl(${foundPriority.selectValue?.hue ?? "0"}, 80%, 50%)`,
    },
    tooltip: `Priority: ${foundPriority.selectValue?.value}`,
  };
}

function assignedDropdownAccessory(
  users: UserObject[] | undefined,
  setAssigneeId: React.Dispatch<React.SetStateAction<string | undefined>>,
  theme: string
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
        {users?.map((user) => assignedDropdownItem(user, theme))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function assignedDropdownItem(user: UserObject, theme: string): JSX.Element {
  return (
    <List.Dropdown.Item
      key={user.id}
      title={`${user.firstname} ${user.lastname}`}
      icon={{
        source: user?.pictureUrl ?? Icon.Person,
        tintColor: user?.pictureUrl
          ? undefined
          : `hsl(${user?.hue ?? "0"}, 80%, ${typeof user?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"})`,
      }}
      value={user.id}
    />
  );
}

function listDropdownAccessory(
  lists: ListObject[] | undefined,
  smartLists: ListObject[] | undefined,
  setList: React.Dispatch<React.SetStateAction<string>>,
  theme: string
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
      <List.Dropdown.Section title="Lists">{lists?.map((item) => listDropdownItem(item, theme))}</List.Dropdown.Section>
      <List.Dropdown.Section title="Smart Lists">
        {smartLists?.map((item) => listDropdownItem(item, theme))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function listDropdownItem(item: ListObject): JSX.Element {
  return (
    <List.Dropdown.Item
      key={item.id}
      title={item.name}
      icon={{
        source: item.appearance?.iconUrl ?? "list-icons/list-light.svg",
        tintColor: getTintColorFromHue(item?.appearance?.hue, ListColors),
      }}
      value={item.id}
    />
  );
}
