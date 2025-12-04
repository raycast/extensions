import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, open } from "@raycast/api";
import { OmniFocusTask } from "../types/task";
import { completeTask } from "../api/complete.task";
import { deleteTask } from "../api/delete-task";

export type TaskListProps = {
  isLoading: boolean;
  tasks?: OmniFocusTask[];
  title?: string;
  onTaskUpdated?: () => unknown;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isShowingDetail?: List.Props["isShowingDetail"];
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
  tasks,
  title,
  onTaskUpdated,
  searchBarAccessory,
  isShowingDetail,
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
        tasks?.map((t) => {
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
                        text={{ value: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "", color: Color.Orange }}
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
                  <Action title="Open" onAction={() => open(`omnifocus:///task/${t.id}`)} icon={Icon.Eye} />
                  <Action
                    title="Complete"
                    onAction={async () => {
                      await actionComplete(t.id);
                    }}
                    icon={Icon.CheckCircle}
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
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
};
