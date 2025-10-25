import { List, ActionPanel, Action, showToast, Toast, Icon, Color, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAllTasks, updateTask } from "./notionClient";
import { suggestDailyPriorities, isAIEnabled, PrioritySuggestion } from "./aiHelper";
import { PRIORITY_ICONS, STATUS_ICONS } from "./types";
import { format, parseISO, isValid } from "date-fns";

export default function SmartPrioritization() {
  const [suggestions, setSuggestions] = useState<PrioritySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, []);

  async function loadPriorities() {
    if (!isAIEnabled()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI not available",
        message: "Please enable Raycast Pro or add OpenAI API key in settings",
        primaryAction: {
          title: "Open Settings",
          onAction: async () => {
            await openExtensionPreferences();
          },
        },
      });
      setIsLoading(false);
      return;
    }

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "🤖 AI is analyzing your tasks...",
      });

      const tasks = await getAllTasks();
      const priorities = await suggestDailyPriorities(tasks);
      setSuggestions(priorities);

      toast.style = Toast.Style.Success;
      toast.title = `✨ Generated ${priorities.length} priority suggestions`;
    } catch (error) {
      console.error("Error loading priorities:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load priorities",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAsInProgress(suggestion: PrioritySuggestion) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task..." });
    try {
      await updateTask(suggestion.task.id, { status: "In progress" });
      toast.style = Toast.Style.Success;
      toast.title = `✓ ${suggestion.task.Name} → In progress`;
      await loadPriorities();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleMarkAsDone(suggestion: PrioritySuggestion) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task..." });
    try {
      await updateTask(suggestion.task.id, { status: "Done", progress: "100%" });
      toast.style = Toast.Style.Success;
      toast.title = `✓ ${suggestion.task.Name} → Done`;
      await loadPriorities();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function getAccessories(suggestion: PrioritySuggestion) {
    const accessories: List.Item.Accessory[] = [];

    // Priority ranking
    accessories.push({
      tag: {
        value: `#${suggestion.suggestedOrder}`,
        color: getOrderColor(suggestion.suggestedOrder),
      },
      tooltip: `AI Priority Rank: ${suggestion.suggestedOrder}`,
    });

    // Task priority
    if (suggestion.task.Priority) {
      accessories.push({
        text: `${PRIORITY_ICONS[suggestion.task.Priority]}`,
        tooltip: `Priority: ${suggestion.task.Priority}`,
      });
    }

    // Due date
    if (suggestion.task["Due Date"]) {
      const dueDate = parseISO(suggestion.task["Due Date"]);
      if (isValid(dueDate)) {
        accessories.push({
          date: dueDate,
          tooltip: `Due: ${format(dueDate, "MMM dd, yyyy")}`,
        });
      }
    }

    // Estimated time
    if (suggestion.task["Estimated Time"]) {
      accessories.push({
        text: `⏱ ${suggestion.task["Estimated Time"]}`,
        tooltip: `Estimated: ${suggestion.task["Estimated Time"]}`,
      });
    }

    return accessories;
  }

  function getOrderColor(order: number): Color {
    switch (order) {
      case 1:
        return Color.Red;
      case 2:
        return Color.Orange;
      case 3:
        return Color.Yellow;
      case 4:
        return Color.Blue;
      case 5:
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && suggestions.length === 0 && (
        <List.EmptyView
          title="No priority suggestions"
          description="All tasks are either done or blocked, or you have no tasks to prioritize."
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        />
      )}

      {suggestions.length > 0 && (
        <List.Section title="🎯 AI Recommended Priorities for Today" subtitle={`Top ${suggestions.length} tasks`}>
          {suggestions.map((suggestion) => (
            <List.Item
              key={suggestion.task.id}
              title={suggestion.task.Name}
              subtitle={suggestion.task.Project || undefined}
              icon={{ source: Icon.Circle, tintColor: getStatusColor(suggestion.task.Status) }}
              accessories={getAccessories(suggestion)}
              detail={
                <List.Item.Detail
                  markdown={`## ${suggestion.task.Name}\n\n### 🤖 AI Reasoning\n\n${suggestion.reason}\n\n---\n\n**Status:** ${STATUS_ICONS[suggestion.task.Status]} ${suggestion.task.Status}\n\n**Project:** ${suggestion.task.Project || "None"}\n\n**Priority:** ${suggestion.task.Priority ? PRIORITY_ICONS[suggestion.task.Priority] + " " + suggestion.task.Priority : "None"}\n\n**Due Date:** ${suggestion.task["Due Date"] ? format(parseISO(suggestion.task["Due Date"]), "MMM dd, yyyy") : "None"}\n\n**Estimated Time:** ${suggestion.task["Estimated Time"] || "Not set"}\n\n**Energy Level:** ${suggestion.task["Energy Level"] || "Not set"}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Notion" url={suggestion.task.url} icon={Icon.Globe} />
                  <Action
                    title="Start Working (in Progress)"
                    icon={Icon.Play}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleMarkAsInProgress(suggestion)}
                  />
                  <Action
                    title="Mark as Done"
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleMarkAsDone(suggestion)}
                  />
                  <Action
                    title="Refresh Priorities"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadPriorities}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
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
