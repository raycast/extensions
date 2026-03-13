import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { batchUpdateTask, getTask, updateTask } from "@/api/task";
import DetailsTask from "@/components/DetailsTask";
import UpdateTask from "@/components/UpdateTask";
import { FieldTemplateObject, Label } from "@/types/fieldTemplate";
import { ListObject } from "@/types/list";
import { TaskObject } from "@/types/task";
import { UserObject } from "@/types/user";
import { CachedPromiseMutateType } from "@/types/utils";
import { WorkspaceObject } from "@/types/workspace";
import { isHeightInstalled } from "@/utils/application";
import { getTintColorFromHue, ListColors } from "@/utils/list";
import { getIconByStatusState, getPriorityIcon } from "@/utils/task";

type Props = {
  task: TaskObject;
  mutateTask: CachedPromiseMutateType<typeof getTask>;
  fieldTemplatesStatuses?: Label[];
  fieldTemplatesPriorities?: Label[];
  fieldTemplatesPrioritiesObj?: FieldTemplateObject;
  fieldTemplatesDueDate?: FieldTemplateObject;
  lists?: ListObject[];
  tasks?: TaskObject[];
  users?: UserObject[];
  workspace?: WorkspaceObject;
  detailsTaskRevalidate?: () => void;
  detailsPage?: boolean;
};

export default function ActionsTask({
  task,
  mutateTask,
  fieldTemplatesStatuses,
  fieldTemplatesPriorities,
  fieldTemplatesPrioritiesObj,
  fieldTemplatesDueDate,
  lists,
  tasks,
  users,
  workspace,
  detailsPage,
  detailsTaskRevalidate,
}: Props) {
  const { push } = useNavigation();
  const { appearance } = environment;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detailsPage ? undefined : (
          <Action
            title="Show Details"
            icon={Icon.AppWindowSidebarRight}
            onAction={() => push(<DetailsTask taskId={task.id} mutateTask={mutateTask} />)}
          />
        )}
        {isHeightInstalled ? (
          <Action.Open
            title="Open Task in Height App"
            icon={"height-app.png"}
            target={`${workspace?.url?.replace("https", "height")}/${task.url.split("/").at(-1)}`}
            application="Height"
          />
        ) : (
          <Action.OpenInBrowser title="Open Task in Browser" icon={Icon.Globe} url={task.url} />
        )}
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
          onAction={() =>
            push(
              <UpdateTask
                task={task}
                mutateTask={mutateTask}
                detailsPage={detailsPage}
                detailsTaskRevalidate={detailsTaskRevalidate}
              />,
            )
          }
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
                await mutateTask(updateTask(task.id, { assigneesIds: [] }));
                if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
                      typeof user?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                    })`,
              }}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Setting assignee",
                });
                try {
                  await mutateTask(updateTask(task.id, { assigneesIds: [user.id] }));
                  if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
        <ActionPanel.Submenu title="Set Status" icon={Icon.Circle} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}>
          {fieldTemplatesStatuses?.map((status) => (
            <Action
              key={status.id}
              title={status.value}
              icon={{
                source: getIconByStatusState(status.id, fieldTemplatesStatuses),
                tintColor: `hsl(${status?.hue ?? "0"}, 80%, ${
                  typeof status?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                })`,
              }}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Setting status",
                });
                try {
                  await mutateTask(updateTask(task.id, { status: status.id }));
                  if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
            title="No priority"
            icon={{
              source: Icon.ExclamationMark,
              tintColor: Color.PrimaryText,
            }}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Unsetting priority",
              });

              try {
                await mutateTask(
                  batchUpdateTask({
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
                  }),
                );
                if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
                  typeof priority?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                })`,
              }}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Setting priority",
                });

                try {
                  await mutateTask(
                    batchUpdateTask({
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
                    }),
                  );
                  if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
          onChange={async (date) => {
            const toast = await showToast({
              style: Toast.Style.Animated,
              title: "Setting priority",
            });

            try {
              await mutateTask(
                batchUpdateTask({
                  patches: [
                    {
                      taskIds: [task.id],
                      effects: [
                        {
                          type: "fields",
                          fieldTemplateId: fieldTemplatesDueDate?.id,
                          field: {
                            date,
                          },
                        },
                      ],
                    },
                  ],
                }),
              );
              if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

              toast.style = Toast.Style.Success;
              toast.title = "Successfully set priority 🎉";
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Failed to set priority 😥";
              toast.message = error instanceof Error ? error.message : undefined;
            }
          }}
        />
        <ActionPanel.Submenu
          title="Set Parent Task"
          icon={Icon.Paperclip}
          shortcut={{ modifiers: ["opt", "shift"], key: "p" }}
        >
          <Action
            title="No parent task"
            icon={{
              source: Icon.Paperclip,
              tintColor: Color.PrimaryText,
            }}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Unsetting parent task",
              });
              try {
                await mutateTask(updateTask(task.id, { parentTaskId: null }));
                if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

                toast.style = Toast.Style.Success;
                toast.title = "Successfully unset parent task 🎉";
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to unset parent task 😥";
                toast.message = error instanceof Error ? error.message : undefined;
              }
            }}
          />
          {tasks
            ?.filter(
              (filteredParentTask) =>
                filteredParentTask.listIds.some((id) => task.listIds.includes(id)) && filteredParentTask.id !== task.id,
            )
            ?.map((parentTask) => (
              <Action
                key={parentTask.id}
                title={parentTask.name}
                icon={{
                  source: parentTask.lists?.[0].appearance?.iconUrl ?? "list-icons/list.svg",
                  tintColor: getTintColorFromHue(parentTask.lists?.[0]?.appearance?.hue, ListColors),
                }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Setting parent task",
                  });
                  try {
                    await mutateTask(updateTask(task.id, { parentTaskId: parentTask.id }));
                    if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
                  source: list.appearance?.iconUrl ?? "list-icons/list.svg",
                  tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
                }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Moving task to list",
                  });
                  try {
                    await mutateTask(updateTask(task.id, { listIds: [list.id] }));
                    if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
                    await mutateTask(updateTask(task.id, { deleted: true }));
                    if (detailsPage && detailsTaskRevalidate) detailsTaskRevalidate();

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
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          icon={Icon.CopyClipboard}
          content={task.name}
        />
        <Action.CopyToClipboard
          title="Copy Task Name With ID"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          icon={Icon.CopyClipboard}
          content={`${task.name} ${task.url.split("/").at(-1) ?? ""}`}
        />
        <Action.CopyToClipboard
          title="Copy Task URL"
          shortcut={{ modifiers: ["opt", "shift"], key: "." }}
          icon={Icon.CopyClipboard}
          content={task.url}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
