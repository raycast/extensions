import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  Form,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import toggl from "./api/toggl";

interface ListItem {
  id: number;
  name: string;
  type: "project" | "task";
  projectName?: string;
  workspaceId: number;
  projectId?: number;
}

const WORKSPACE_ID = 20090256; // Hardcoded from show-tasks.tsx

function keywordsForItem(item: ListItem): string[] {
  return Object.values(item).filter(
    (value) => typeof value === "string" && value,
  ) as string[];
}

export default function Command() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndCacheItems = useCallback(async () => {
    setIsLoading(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Fetching projects and tasks...",
    });
    try {
      const allItems: ListItem[] = [];
      const projects = await toggl.getProjects(WORKSPACE_ID);

      for (const proj of projects) {
        allItems.push({
          id: proj.id,
          name: proj.name,
          type: "project",
          workspaceId: proj.workspace_id,
        });
        try {
          const projectTasks = await toggl.getTasks(WORKSPACE_ID, proj.id);
          for (const task of projectTasks) {
            allItems.push({
              id: task.id,
              name: task.name,
              type: "task",
              projectName: proj.name,
              workspaceId: WORKSPACE_ID,
              projectId: proj.id,
            });
          }
        } catch {
          console.error(`Failed to fetch tasks for project ${proj.name}`);
        }
      }

      setItems(allItems);
      await LocalStorage.setItem("start-timer-items", JSON.stringify(allItems));
      await showToast({
        style: Toast.Style.Success,
        title: "Projects and tasks updated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch items",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadItems() {
      const cachedItems =
        await LocalStorage.getItem<string>("start-timer-items");
      if (cachedItems) {
        setItems(JSON.parse(cachedItems));
        setIsLoading(false);
      } else {
        await fetchAndCacheItems();
      }
    }
    loadItems();
  }, [fetchAndCacheItems]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a project or task to start a timer..."
    >
      <List.Section title="Actions">
        <List.Item
          title="Start a new timer without a project"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Start Timer"
                target={<TimerForm workspaceId={WORKSPACE_ID} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Refresh Projects and Tasks"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={fetchAndCacheItems} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Projects & Tasks">
        {items
          .slice()
          .sort((a, b) => {
            const typeCompare = b.type.localeCompare(a.type);
            if (typeCompare !== 0) return typeCompare;
            return a.name.localeCompare(b.name);
          })
          .map((item) => (
            <List.Item
              key={`${item.type}-${item.id}`}
              title={item.name}
              subtitle={item.type === "task" ? item.projectName : "Project"}
              keywords={keywordsForItem(item)}
              icon={item.type === "project" ? Icon.List : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Timer"
                    onAction={async () => {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Starting timer...",
                      });
                      try {
                        await toggl.startTimeEntry(
                          item.workspaceId,
                          item.name,
                          item.type === "project" ? item.id : item.projectId,
                          item.type === "task" ? item.id : undefined,
                        );
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Timer started",
                          message: item.name,
                        });
                        closeMainWindow({
                          clearRootSearch: true,
                          popToRootType: PopToRootType.Immediate,
                        });
                      } catch (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to start timer",
                          message:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function TimerForm({
  workspaceId,
  projectId,
  taskId,
  description: initialDescription,
}: {
  workspaceId: number;
  projectId?: number;
  taskId?: number;
  description?: string;
}) {
  async function handleSubmit(values: { description: string }) {
    if (!values.description) {
      showToast({
        style: Toast.Style.Failure,
        title: "Description is required",
      });
      return;
    }
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting timer...",
    });
    try {
      await toggl.startTimeEntry(
        workspaceId,
        values.description,
        projectId,
        taskId,
      );
      await showToast({ style: Toast.Style.Success, title: "Timer started" });
      closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start timer",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="What are you working on?"
        defaultValue={initialDescription}
      />
    </Form>
  );
}
