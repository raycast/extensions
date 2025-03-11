import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, open, Detail } from "@raycast/api";
import { OmniFocusTask } from "../types/task";
import { completeTask } from "../api/complete.task";
import { deleteTask } from "../api/delete-task";
import { cleanupPerspective } from "../api/cleanup";

export type GroupBy = "none" | "project" | "tags" | "priority";

export type TaskListProps = {
  isLoading: boolean;
  tasks?: OmniFocusTask[];
  title?: string;
  onTaskUpdated?: () => unknown;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isShowingDetail?: List.Props["isShowingDetail"];
  groupBy?: GroupBy;
};

function getAccessories(task: OmniFocusTask, isShowingDetail: TaskListProps["isShowingDetail"]): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (isShowingDetail) {
    return accessories;
  }
  if (task.flagged) {
    accessories.push({ icon: Icon.Flag });
  }

  if (task.deferDate) {
    accessories.push({ tag: { value: new Date(task.deferDate), color: Color.SecondaryText }, tooltip: "Defer until" });
  }

  if (task.dueDate) {
    accessories.push({ tag: { value: new Date(task.dueDate), color: Color.Orange }, tooltip: "Due" });
  }

  if (task.tags.length) {
    const tagsToShow = task.tags.slice(0, 3);
    const hasMoreTags = task.tags.length > 3;

    accessories.push(
      ...tagsToShow.map((t) => ({
        tag: t,
      })),
    );

    if (hasMoreTags) {
      accessories.push({
        tag: "...",
        tooltip: "More tags are associated with this task.",
      });
    }
  }

  return accessories;
}

function groupTasks(tasks: OmniFocusTask[], groupBy: GroupBy): { title: string; tasks: OmniFocusTask[] }[] {
  // Ensure tasks is an array
  const taskArray = Array.isArray(tasks) ? tasks : [];

  if (!taskArray.length || groupBy === "none") {
    return [{ title: "All Tasks", tasks: taskArray }];
  }

  switch (groupBy) {
    case "project": {
      const groupedByProject = new Map<string, OmniFocusTask[]>();
      taskArray.forEach((task) => {
        const projectName = task.projectName || "No Project";
        if (!groupedByProject.has(projectName)) {
          groupedByProject.set(projectName, []);
        }
        groupedByProject.get(projectName)?.push(task);
      });
      return Array.from(groupedByProject.entries())
        .sort(([a], [b]) => {
          if (a === "No Project") return 1;
          if (b === "No Project") return -1;
          return a.localeCompare(b);
        })
        .map(([projectName, tasks]) => ({
          title: projectName,
          tasks,
        }));
    }

    case "tags": {
      const groupedByTags = new Map<string, OmniFocusTask[]>();
      taskArray.forEach((task) => {
        if (task.tags.length === 0) {
          const noTags = "No Tags";
          if (!groupedByTags.has(noTags)) {
            groupedByTags.set(noTags, []);
          }
          groupedByTags.get(noTags)?.push(task);
        } else {
          task.tags.forEach((tag) => {
            if (!groupedByTags.has(tag)) {
              groupedByTags.set(tag, []);
            }
            groupedByTags.get(tag)?.push(task);
          });
        }
      });
      return Array.from(groupedByTags.entries())
        .sort(([a], [b]) => {
          if (a === "No Tags") return 1;
          if (b === "No Tags") return -1;
          return a.localeCompare(b);
        })
        .map(([title, tasks]) => ({
          title,
          tasks: tasks.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.tasks.length > 0);
    }

    case "priority": {
      const priorityOrder = ["Flagged", "Due", "None"];
      const groupedByPriority = new Map<string, OmniFocusTask[]>();

      // Initialize priority groups
      priorityOrder.forEach((p) => groupedByPriority.set(p, []));

      // Sort tasks into priority groups
      taskArray.forEach((task) => {
        let priority = "None";
        if (task.flagged) {
          priority = "Flagged";
        } else if (task.dueDate) {
          priority = "Due";
        }
        groupedByPriority.get(priority)?.push(task);
      });

      // Return only non-empty priority groups in the specified order
      return priorityOrder
        .filter((priority) => groupedByPriority.get(priority)?.length)
        .map((priority) => ({
          title: priority,
          tasks: groupedByPriority.get(priority) || [],
        }));
    }

    default:
      return [{ title: "All Tasks", tasks: taskArray }];
  }
}

type TaskMetadataItem = {
  title: string;
  value: string;
};

function TaskDetailView({
  task,
  onComplete,
  onDelete,
  onCleanup,
}: {
  task: OmniFocusTask;
  onComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCleanup: () => Promise<void>;
}) {
  const metadata: TaskMetadataItem[] = [
    { title: "Status", value: task.completed ? "Completed" : "Active" },
    { title: "Flagged", value: task.flagged ? "Yes" : "No" },
    ...(task.projectName ? [{ title: "Project", value: task.projectName }] : []),
    ...(task.deferDate ? [{ title: "Defer Date", value: new Date(task.deferDate).toLocaleDateString() }] : []),
    ...(task.dueDate ? [{ title: "Due Date", value: new Date(task.dueDate).toLocaleDateString() }] : []),
    ...(task.tags.length > 0 ? [{ title: "Tags", value: task.tags.join(", ") }] : []),
  ];

  const markdown = `
# ${task.name}

${metadata.map((item) => `**${item.title}:** ${item.value}`).join("\n\n")}

${task.note ? `\n## Notes\n\n${task.note}` : ""}
  `.trim();

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open in Omnifocus" onAction={() => open(`omnifocus:///task/${task.id}`)} icon={Icon.Eye} />
            <Action title="Complete" onAction={onComplete} icon={Icon.CheckCircle} />
            <Action
              title="Clean Up"
              onAction={onCleanup}
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
            <Action
              title="Delete"
              style={Action.Style.Destructive}
              onAction={onDelete}
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export const TaskList: React.FunctionComponent<TaskListProps> = ({
  isLoading,
  tasks = [],
  title,
  onTaskUpdated,
  searchBarAccessory,
  isShowingDetail,
  groupBy = "none",
}) => {
  async function actionDelete(id: string) {
    try {
      await deleteTask(id);
      await showToast({
        title: "Task deleted!",
        style: Toast.Style.Success,
      });
      await onTaskUpdated?.();
    } catch {
      await showToast({
        title: "An error occurred while deleting the task.",
        style: Toast.Style.Failure,
      });
    }
  }

  async function actionComplete(id: string) {
    try {
      await completeTask(id);
      await showToast({
        title: "Task completed!",
        style: Toast.Style.Success,
      });
      await onTaskUpdated?.();
    } catch {
      await showToast({
        title: "An error occurred while completing the task.",
        style: Toast.Style.Failure,
      });
    }
  }

  async function actionCleanup() {
    try {
      await cleanupPerspective();
      await showToast({
        title: "Perspective cleaned up!",
        style: Toast.Style.Success,
      });
      await onTaskUpdated?.();
    } catch {
      await showToast({
        title: "An error occurred while cleaning up the perspective.",
        style: Toast.Style.Failure,
      });
    }
  }

  const groupedTasks = groupTasks(tasks, groupBy);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      searchBarAccessory={searchBarAccessory}
      isShowingDetail={isShowingDetail && tasks && tasks.length > 0}
    >
      {!tasks?.length ? (
        <List.EmptyView title={`No tasks in ${title}`} />
      ) : (
        groupedTasks.map((group) => (
          <List.Section key={group.title} title={group.title}>
            {group.tasks.map((t) => {
              return (
                <List.Item
                  key={t.id}
                  title={t.name}
                  icon={!t.completed ? Icon.Circle : Icon.Checkmark}
                  detail={
                    <List.Item.Detail
                      markdown={t.name}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Defer date"
                            text={t.deferDate ? new Date(t.deferDate).toLocaleDateString() : undefined}
                            icon={Icon.ArrowClockwise}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Due date"
                            text={{
                              value: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
                              color: Color.Orange,
                            }}
                            icon={Icon.Calculator}
                          />
                          <List.Item.Detail.Metadata.TagList title="Tags">
                            {t.tags.map((tag) => (
                              <List.Item.Detail.Metadata.TagList.Item text={tag} key={tag} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label title="Note" text={t.note} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  accessories={getAccessories(t, isShowingDetail)}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          title="View Details"
                          target={
                            <TaskDetailView
                              task={t}
                              onComplete={async () => await actionComplete(t.id)}
                              onDelete={async () => await actionDelete(t.id)}
                              onCleanup={actionCleanup}
                            />
                          }
                          icon={Icon.Eye}
                        />
                        <Action
                          title="Complete"
                          onAction={async () => {
                            await actionComplete(t.id);
                          }}
                          icon={Icon.CheckCircle}
                        />
                        <Action
                          title="Clean Up"
                          onAction={actionCleanup}
                          icon={Icon.Checkmark}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                        />
                        <Action
                          title="Delete"
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            await actionDelete(t.id);
                          }}
                          icon={Icon.Trash}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
};
