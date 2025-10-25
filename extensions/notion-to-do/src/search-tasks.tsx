import { List, ActionPanel, Action, showToast, Toast, Icon, Color, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAllTasks, updateTask } from "./notionClient";
import { NotionTask, PRIORITY_ICONS, STATUS_ICONS } from "./types";
import { format, parseISO, isValid } from "date-fns";
import { parseNaturalLanguageSearch, isAIEnabled } from "./aiHelper";

export default function SearchTasks() {
  const [tasks, setTasks] = useState<NotionTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isAISearch, setIsAISearch] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const fetchedTasks = await getAllTasks();
      // Sort by last edited time (most recent first)
      const sortedTasks = fetchedTasks.sort((a, b) => {
        if (!a.lastEditedTime || !b.lastEditedTime) return 0;
        return new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime();
      });
      setTasks(sortedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        primaryAction:
          error instanceof Error && error.message.includes("Unauthorized")
            ? {
                title: "Open Settings",
                onAction: async () => {
                  await openExtensionPreferences();
                },
              }
            : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAsDone(task: NotionTask) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task..." });
    try {
      await updateTask(task.id, { status: "Done", progress: "100%" });
      toast.style = Toast.Style.Success;
      toast.title = `✓ ${task.Name} → Done`;
      await loadTasks();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleAISearch() {
    if (!searchText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a search query",
      });
      return;
    }

    if (!isAIEnabled()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI not available",
        message: "Please enable Raycast Pro or add OpenAI API key. Using regular search.",
      });
      setIsAISearch(false);
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🤖 AI is interpreting your search...",
    });

    try {
      const filters = await parseNaturalLanguageSearch(searchText);
      toast.style = Toast.Style.Success;
      toast.title = "✨ AI search applied";
      setIsAISearch(true);

      // Apply AI filters
      const filtered = tasks.filter((task) => {
        let matches = true;

        if (filters.status && filters.status.length > 0) {
          matches = matches && filters.status.includes(task.Status);
        }

        if (filters.priority && filters.priority.length > 0) {
          matches = matches && task.Priority && filters.priority.includes(task.Priority);
        }

        if (filters.tags && filters.tags.length > 0) {
          matches = matches && task.Tags && filters.tags.some((tag) => task.Tags?.includes(tag));
        }

        if (filters.project) {
          matches = matches && task.Project === filters.project;
        }

        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          matches =
            matches &&
            (task.Name.toLowerCase().includes(searchLower) || task.Project?.toLowerCase().includes(searchLower));
        }

        return matches;
      });

      setTasks(filtered);
    } catch (error) {
      console.error("Error in AI search:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "AI search failed, using regular search";
      setIsAISearch(false);
    }
  }

  const filteredTasks = isAISearch
    ? tasks
    : tasks.filter((task) => {
        if (!searchText) return true;

        const searchLower = searchText.toLowerCase();
        return (
          task.Name.toLowerCase().includes(searchLower) ||
          task.Status.toLowerCase().includes(searchLower) ||
          task.Project?.toLowerCase().includes(searchLower) ||
          task.Priority?.toLowerCase().includes(searchLower) ||
          task.Tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      });

  function getAccessories(task: NotionTask) {
    const accessories: List.Item.Accessory[] = [];

    // Status
    accessories.push({
      text: `${STATUS_ICONS[task.Status]} ${task.Status}`,
      tooltip: `Status: ${task.Status}`,
    });

    // Priority
    if (task.Priority) {
      accessories.push({
        text: `${PRIORITY_ICONS[task.Priority]}`,
        tooltip: `Priority: ${task.Priority}`,
      });
    }

    // Progress
    if (task.Progress && task.Status !== "Done") {
      accessories.push({
        text: task.Progress,
        tooltip: `Progress: ${task.Progress}`,
      });
    }

    // Due Date
    if (task["Due Date"]) {
      const dueDate = parseISO(task["Due Date"]);
      if (isValid(dueDate)) {
        accessories.push({
          date: dueDate,
          tooltip: `Due: ${format(dueDate, "MMM dd, yyyy")}`,
        });
      }
    }

    // Estimated Time
    if (task["Estimated Time"]) {
      accessories.push({
        text: `⏱ ${task["Estimated Time"]}`,
        tooltip: `Estimated: ${task["Estimated Time"]}`,
      });
    }

    return accessories;
  }

  function getSubtitle(task: NotionTask): string {
    const parts: string[] = [];

    if (task.Project) {
      parts.push(task.Project);
    }

    if (task.Tags && task.Tags.length > 0) {
      parts.push(`Tags: ${task.Tags.join(", ")}`);
    }

    return parts.join(" · ");
  }

  // Group tasks by status
  const tasksByStatus = filteredTasks.reduce(
    (acc, task) => {
      if (!acc[task.Status]) {
        acc[task.Status] = [];
      }
      acc[task.Status].push(task);
      return acc;
    },
    {} as Record<string, NotionTask[]>,
  );

  const statusOrder: string[] = ["In progress", "To-do", "Blocked", "Backlog", "Done"];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setSearchText(text);
        setIsAISearch(false); // Reset AI search when text changes
      }}
      searchBarPlaceholder={isAISearch ? "🤖 AI Search Active" : "Search tasks or use ⌘+K for AI search..."}
      throttle
      searchBarAccessory={
        isAIEnabled() ? (
          <List.Dropdown tooltip="Search Mode">
            <List.Dropdown.Item title="Regular Search" value="regular" />
            <List.Dropdown.Item title="AI Search" value="ai" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {!searchText && filteredTasks.length === 0 && (
        <List.EmptyView
          title="No tasks found"
          description="Create a new task to get started!"
          icon={{ source: Icon.Document, tintColor: Color.SecondaryText }}
        />
      )}

      {searchText && filteredTasks.length === 0 && (
        <List.EmptyView
          title="No matching tasks"
          description={`No tasks found matching "${searchText}"`}
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
        />
      )}

      {statusOrder.map((status) => {
        const tasksInStatus = tasksByStatus[status];
        if (!tasksInStatus || tasksInStatus.length === 0) return null;

        return (
          <List.Section
            key={status}
            title={`${STATUS_ICONS[status as keyof typeof STATUS_ICONS] || ""} ${status}`}
            subtitle={`${tasksInStatus.length} tasks`}
          >
            {tasksInStatus.map((task) => (
              <List.Item
                key={task.id}
                title={task.Name}
                subtitle={getSubtitle(task)}
                icon={{ source: Icon.Circle, tintColor: getStatusColor(task.Status) }}
                accessories={getAccessories(task)}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open in Notion" url={task.url} icon={Icon.Globe} />
                      {isAIEnabled() && (
                        <Action
                          title="AI Search"
                          icon={Icon.Wand}
                          shortcut={{ modifiers: ["cmd"], key: "k" }}
                          onAction={handleAISearch}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Task URL"
                        content={task.url}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {task.Status !== "Done" && (
                        <Action
                          title="Mark as Done"
                          icon={Icon.Check}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => handleMarkAsDone(task)}
                        />
                      )}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={loadTasks}
                      />
                    </ActionPanel.Section>
                    {task.Link && (
                      <ActionPanel.Section>
                        <Action.OpenInBrowser title="Open Linked Resource" url={task.Link} icon={Icon.Link} />
                      </ActionPanel.Section>
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function getStatusColor(status: string): Color {
  switch (status) {
    case "Done":
      return Color.Green;
    case "In progress":
      return Color.Blue;
    case "Blocked":
      return Color.Red;
    case "To-do":
      return Color.Yellow;
    case "Backlog":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
}
