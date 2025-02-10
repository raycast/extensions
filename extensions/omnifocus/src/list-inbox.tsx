import { Action, ActionPanel, Color, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { completeTask } from "./lib/api/complete.task";
import { deleteTask } from "./lib/api/delete-task";
import { listTasks } from "./lib/api/list-tasks";
import { OmniFocusTask } from "./lib/types/task";
import { useValidateRequirements } from "./lib/utils/useValidateRequirements";

function getAccessories(task: OmniFocusTask): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
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

export default function ListInboxTasks() {
  const [tasks, setTasks] = useState<OmniFocusTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { loading, check, error } = useValidateRequirements();
  const [requirementError, setRequirementError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchTasks = async (initialFetch = false) => {
    setIsLoading(true);
    try {
      const newTasks = await listTasks();
      setTasks(newTasks);
    } catch {
      if (initialFetch) {
        setApiError("An error occurred while getting your inbox tasks.");
      } else {
        await showToast({
          title: "An error occurred while refreshing your inbox tasks.",
          style: Toast.Style.Failure,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  async function actionComplete(id: string) {
    try {
      await completeTask(id);
      await showToast({
        title: "Task completed!",
        style: Toast.Style.Success,
      });
      await fetchTasks();
    } catch {
      await showToast({
        title: "An error occurred while completing the task.",
        style: Toast.Style.Failure,
      });
    }
  }

  async function actionDelete(id: string) {
    try {
      await deleteTask(id);
      await showToast({
        title: "Task deleted!",
        style: Toast.Style.Success,
      });
      await fetchTasks();
    } catch {
      await showToast({
        title: "An error occurred while deleting the task.",
        style: Toast.Style.Failure,
      });
    }
  }

  useEffect(() => {
    if (!loading) {
      if (check) {
        fetchTasks(true);
      } else {
        setRequirementError(error);
      }
    }
  }, [loading, check, error]);

  if (requirementError) {
    return (
      <List>
        <List.EmptyView title={requirementError} icon={Icon.Plug} />
      </List>
    );
  }

  if (apiError) {
    return (
      <List>
        <List.EmptyView title={apiError} icon={Icon.SpeechBubbleImportant} />
      </List>
    );
  }

  return (
    <List isLoading={loading || isLoading}>
      {tasks.length === 0 && <List.EmptyView title="No tasks in inbox" />}
      {tasks.length > 0 &&
        tasks.map((t) => {
          return (
            <List.Item
              key={t.id}
              title={t.name}
              icon={!t.completed ? Icon.Circle : Icon.Checkmark}
              accessories={getAccessories(t)}
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
        })}
    </List>
  );
}
