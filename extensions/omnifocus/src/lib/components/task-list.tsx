import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { OmniFocusTask } from "../types/task";
import { groupTasks } from "../utils/group-tasks";
import { useTaskActions } from "../hooks/use-task-actions";
import { TaskDetailView } from "./task-detail-view";

export type GroupBy = "none" | "project" | "tags" | "priority";

export type TaskListProps = {
  isLoading: boolean;
  tasks?: OmniFocusTask[];
  title?: string;
  onTaskUpdated?: () => Promise<void>;
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

export const TaskList: React.FunctionComponent<TaskListProps> = ({
  isLoading,
  tasks = [],
  title,
  onTaskUpdated,
  searchBarAccessory,
  isShowingDetail,
  groupBy = "none",
}) => {
  const { actionDelete, actionComplete, actionCleanup } = useTaskActions(onTaskUpdated);
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
                      markdown={`# ${t.name}`}
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
