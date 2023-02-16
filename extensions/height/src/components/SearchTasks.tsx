import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { differenceInCalendarDays, format } from "date-fns";
import { useEffect, useState } from "react";
import { ApiTask } from "../api/task";
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

  const { fieldTemplatesStatuses, fieldTemplatesPrioritiesObj, fieldTemplatesPriorities, fieldTemplatesIsLoading } =
    useFieldTemplates();
  const { users, usersIsLoading } = useUsers();
  const { tasks, tasksIsLoading, tasksMutate } = useTasks({ listId, assigneeId });

  useEffect(() => {
    if (!tasks) return;
    filterTasks(
      tasks.filter(
        (task) =>
          task.name.toLowerCase().includes(searchText.toLowerCase()) && (list === "all" || task.listIds.includes(list))
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
                    typeof status?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
                  })`,
                }}
                accessories={[
                  getTaskDueDateAccessory(task),
                  getTaskPriorityAccessory(task, theme),
                  ...getAssignedUsers(task.assigneesIds, users),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Show Details"
                        icon={Icon.AppWindowSidebarRight}
                        onAction={async () => await Clipboard.copy(JSON.stringify(task, null, 2))}
                      />
                      <Action.OpenInBrowser title="Open Task in Browser" icon={Icon.Globe} url={task.url} />
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
                        onAction={() => push(<UpdateTask task={task} mutateTask={tasksMutate} />)}
                      />
                      <ActionPanel.Submenu
                        title="Assign To"
                        icon={Icon.AddPerson}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      >
                        <Action
                          title="Unassigned"
                          icon={{
                            source: Icon.Person,
                            tintColor: Color.PrimaryText,
                          }}
                          onAction={async () => {
                            const toast = await showToast({
                              style: Toast.Style.Animated,
                              title: "Unsetting assignee",
                            });
                            try {
                              await tasksMutate(ApiTask.update(task.id, { assigneesIds: [] }));

                              toast.style = Toast.Style.Success;
                              toast.title = "Successfully unset assignee 🎉";
                            } catch (error) {
                              toast.style = Toast.Style.Failure;
                              toast.title = "Failed to unset assignee 😥";
                              toast.message = error instanceof Error ? error.message : undefined;
                            }
                          }}
                        />
                        {users?.map((user) => (
                          <Action
                            key={user.id}
                            title={`${user.firstname} ${user.lastname}`}
                            icon={{
                              source: user?.pictureUrl ?? Icon.Person,
                              tintColor: user?.pictureUrl
                                ? undefined
                                : `hsl(${user?.hue ?? "0"}, 80%, ${
                                    typeof user?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
                                  })`,
                            }}
                            onAction={async () => {
                              const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: "Setting assignee",
                              });
                              try {
                                await tasksMutate(ApiTask.update(task.id, { assigneesIds: [user.id] }));

                                toast.style = Toast.Style.Success;
                                toast.title = "Successfully set assignee 🎉";
                              } catch (error) {
                                toast.style = Toast.Style.Failure;
                                toast.title = "Failed to set assignee 😥";
                                toast.message = error instanceof Error ? error.message : undefined;
                              }
                            }}
                          />
                        ))}
                      </ActionPanel.Submenu>
                      <ActionPanel.Submenu
                        title="Set Status"
                        icon={Icon.Circle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      >
                        {fieldTemplatesStatuses?.map((status) => (
                          <Action
                            key={status.id}
                            title={status.value}
                            icon={{
                              source: getIconByStatusState(status.id, fieldTemplatesStatuses),
                              tintColor: `hsl(${status?.hue ?? "0"}, 80%, ${
                                typeof status?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
                              })`,
                            }}
                            onAction={async () => {
                              const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: "Setting status",
                              });
                              try {
                                await tasksMutate(ApiTask.update(task.id, { status: status.id }));

                                toast.style = Toast.Style.Success;
                                toast.title = "Successfully set status 🎉";
                              } catch (error) {
                                toast.style = Toast.Style.Failure;
                                toast.title = "Failed to set status 😥";
                                toast.message = error instanceof Error ? error.message : undefined;
                              }
                            }}
                          />
                        ))}
                      </ActionPanel.Submenu>
                      <ActionPanel.Submenu
                        title="Set Priority"
                        icon={Icon.Exclamationmark3}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      >
                        <Action
                          title="No Priority"
                          icon={{
                            source: Icon.ExclamationMark,
                            tintColor: Color.PrimaryText,
                          }}
                          onAction={async () => {
                            const toast = await showToast({
                              style: Toast.Style.Animated,
                              title: "Unsetting priority",
                            });
                            console.log(task.fields[0]);
                            try {
                              await tasksMutate(
                                ApiTask.batchUpdate({
                                  patches: [
                                    {
                                      taskIds: [task.id],
                                      effects: [
                                        {
                                          type: "fields",
                                          fieldTemplateId: fieldTemplatesPrioritiesObj?.id,
                                          field: {
                                            label: null,
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                })
                              );

                              toast.style = Toast.Style.Success;
                              toast.title = "Successfully unset priority 🎉";
                            } catch (error) {
                              toast.style = Toast.Style.Failure;
                              toast.title = "Failed to unset priority 😥";
                              toast.message = error instanceof Error ? error.message : undefined;
                            }
                          }}
                        />
                        {fieldTemplatesPriorities?.map((priority) => (
                          <Action
                            key={priority.id}
                            title={priority.value}
                            icon={{
                              source: getPriorityIcon(priority.value),
                              tintColor: `hsl(${priority?.hue ?? "0"}, 80%, ${
                                typeof priority?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
                              })`,
                            }}
                            onAction={async () => {
                              const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: "Setting priority",
                              });
                              console.log("task:", task.fields[0]);
                              try {
                                await tasksMutate(
                                  ApiTask.batchUpdate({
                                    patches: [
                                      {
                                        taskIds: [task.id],
                                        effects: [
                                          {
                                            type: "fields",
                                            fieldTemplateId: fieldTemplatesPrioritiesObj?.id,
                                            field: {
                                              label: {
                                                optionId: priority.id,
                                              },
                                            },
                                          },
                                        ],
                                      },
                                    ],
                                  })
                                );

                                toast.style = Toast.Style.Success;
                                toast.title = "Successfully set priority 🎉";
                              } catch (error) {
                                toast.style = Toast.Style.Failure;
                                toast.title = "Failed to set priority 😥";
                                toast.message = error instanceof Error ? error.message : undefined;
                              }
                            }}
                          />
                        ))}
                      </ActionPanel.Submenu>
                      <Action.PickDate
                        title="Set Due Date..."
                        icon={Icon.Calendar}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onChange={async (date) => await showHUD(`Set Due Date to ${date?.toISOString()}`)}
                      />
                      <ActionPanel.Submenu
                        title="Set Parent Task"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["opt", "shift"], key: "p" }}
                      >
                        {tasks
                          ?.filter(
                            (filteredParentTask) =>
                              filteredParentTask.listIds.some((id) => task.listIds.includes(id)) &&
                              filteredParentTask.id !== task.id
                          )
                          ?.map((parentTask) => (
                            <Action
                              key={parentTask.id}
                              title={parentTask.name}
                              icon={{
                                source: parentTask.lists?.[0].appearance?.iconUrl ?? "list-icons/list-light.svg",
                                tintColor: getTintColorFromHue(parentTask.lists?.[0]?.appearance?.hue, ListColors),
                              }}
                              onAction={async () => {
                                const toast = await showToast({
                                  style: Toast.Style.Animated,
                                  title: "Setting parent task",
                                });
                                try {
                                  await tasksMutate(ApiTask.update(task.id, { parentTaskId: parentTask.id }));

                                  toast.style = Toast.Style.Success;
                                  toast.title = "Successfully set parent task 🎉";
                                } catch (error) {
                                  toast.style = Toast.Style.Failure;
                                  toast.title = "Failed to set parent task 😥";
                                  toast.message = error instanceof Error ? error.message : undefined;
                                }
                              }}
                            />
                          ))}
                      </ActionPanel.Submenu>
                      <ActionPanel.Submenu
                        title="Move To List"
                        icon={Icon.Folder}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                      >
                        {lists
                          ?.filter((filteredList) => !task.listIds.includes(filteredList.id))
                          ?.map((list) => (
                            <Action
                              key={list.id}
                              title={list.name}
                              icon={{
                                source: list.appearance?.iconUrl ?? "list-icons/list-light.svg",
                                tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
                              }}
                              onAction={async () => {
                                const toast = await showToast({
                                  style: Toast.Style.Animated,
                                  title: "Moving task to list",
                                });
                                try {
                                  await tasksMutate(ApiTask.update(task.id, { listIds: [list.id] }));

                                  toast.style = Toast.Style.Success;
                                  toast.title = "Successfully moved task 🎉";
                                } catch (error) {
                                  toast.style = Toast.Style.Failure;
                                  toast.title = "Failed to move task 😥";
                                  toast.message = error instanceof Error ? error.message : undefined;
                                }
                              }}
                            />
                          ))}
                      </ActionPanel.Submenu>
                      <Action
                        title="Delete Task"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={async () => {
                          await confirmAlert({
                            title: "Delete Task",
                            message: "Are you sure you want to delete this task?",
                            icon: {
                              source: Icon.Trash,
                              tintColor: Color.Red,
                            },
                            primaryAction: {
                              title: "Delete",
                              style: Alert.ActionStyle.Destructive,
                              onAction: async () => {
                                const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting task" });
                                try {
                                  await tasksMutate(ApiTask.update(task.id, { deleted: true }));

                                  toast.style = Toast.Style.Success;
                                  toast.title = "Successfully deleted task 🎉";
                                } catch (error) {
                                  toast.style = Toast.Style.Failure;
                                  toast.title = "Failed to delete task 😥";
                                  toast.message = error instanceof Error ? error.message : undefined;
                                }
                              },
                            },
                          });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Task ID"
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                        icon={Icon.CopyClipboard}
                        content={task.url.split("/").at(-1) ?? ""}
                      />
                      <Action.CopyToClipboard
                        title="Copy Task Name"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                        icon={Icon.CopyClipboard}
                        content={task.name}
                      />
                      <Action.CopyToClipboard
                        title="Copy Task URL"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                        icon={Icon.CopyClipboard}
                        content={task.url}
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
  const foundDueDate = task.fields.find((field) => field.name.toLowerCase() === "due date");
  if (!foundDueDate || !foundDueDate.date) return {};
  const dueDate = new Date(foundDueDate.date);
  const today = new Date();

  return {
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

function getTaskPriorityAccessory(task: TaskObject, theme: string) {
  if (task.completed) return {};
  const foundPriority = task.fields.find((field) => field.name.toLowerCase() === "priority");
  if (!foundPriority) return {};
  return {
    icon: {
      source: getPriorityIcon(foundPriority.selectValue?.value),
      tintColor: `hsl(${foundPriority.selectValue?.hue ?? "0"}, 80%, ${
        typeof foundPriority.selectValue?.hue === "number" ? "60%" : theme === "dark" ? "100%" : "0"
      })`,
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
  setList: React.Dispatch<React.SetStateAction<string>>
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
        source: list.appearance?.iconUrl ?? "list-icons/list-light.svg",
        tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
      }}
      value={list.id}
    />
  );
}
