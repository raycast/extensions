import { useEffect, useState } from "react";
import { OmniFocusTask } from "./lib/types/task";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast, open, Keyboard } from "@raycast/api";
import { listTasks } from "./lib/api/list-tasks";
import { deleteTask } from "./lib/api/delete-task";
import { completeTask } from "./lib/api/complete.task";

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

  const fetchTasks = async () => {
    setIsLoading(true);
    const newTasks = await listTasks();
    setTasks(newTasks);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <List isLoading={isLoading}>
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
                      await completeTask(t.id);
                      await showToast({
                        title: "Task completed!",
                        style: Toast.Style.Success,
                      });
                      await fetchTasks();
                    }}
                    icon={Icon.CheckCircle}
                  />
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await deleteTask(t.id);
                      await showToast({
                        title: "Task deleted!",
                        style: Toast.Style.Success,
                      });
                      await fetchTasks();
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
