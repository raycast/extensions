import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { getAllPriorities } from "./api";
import { NotionThought, Priority } from "./types";

export default function TopPrioritiesAll() {
  const [thoughts, setThoughts] = useState<NotionThought[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPriorities() {
      try {
        const allPriorities = await getAllPriorities();
        setThoughts(allPriorities);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch priorities",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPriorities();
  }, []);

  function getPriorityIcon(priority: Priority): {
    source: Icon;
    tintColor: Color;
  } {
    switch (priority) {
      case "Urgent":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      case "High":
        return { source: Icon.ArrowUp, tintColor: Color.Orange };
      case "Medium":
        return { source: Icon.Minus, tintColor: Color.Yellow };
      case "Low":
        return { source: Icon.ArrowDown, tintColor: Color.Green };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  function getTypeIcon(type: string): Icon {
    switch (type) {
      case "Task":
        return Icon.CheckCircle;
      case "Idea":
        return Icon.Lightbulb;
      case "Concern":
        return Icon.Warning;
      case "Decision":
        return Icon.QuestionMark;
      case "Question":
        return Icon.Message;
      case "Note":
        return Icon.Document;
      default:
        return Icon.Circle;
    }
  }

  function getCategoryIcon(category: string): {
    source: Icon;
    tintColor: Color;
  } {
    switch (category) {
      case "Work":
        return { source: Icon.Building, tintColor: Color.Blue };
      case "Personal":
        return { source: Icon.House, tintColor: Color.Green };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search all priorities...">
      {thoughts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Priorities Found"
          description="Create some thoughts to see them prioritized here"
          icon="📋"
        />
      )}

      {thoughts.map((thought: NotionThought) => (
        <List.Item
          key={thought.id}
          title={thought.title}
          subtitle={thought.description}
          accessories={[
            {
              text: thought.category,
              icon: getCategoryIcon(thought.category),
            },
            {
              text: thought.priority,
              icon: getPriorityIcon(thought.priority),
            },
            {
              text: `Health: ${thought.health?.toFixed(1) || "N/A"}`,
              icon: Icon.Heart,
            },
            {
              text: formatDate(thought.created),
              icon: Icon.Calendar,
            },
          ]}
          icon={getTypeIcon(thought.type)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Notion"
                url={`https://notion.so/${thought.id.replace(/-/g, "")}`}
              />
              <Action.CopyToClipboard
                title="Copy Title"
                content={thought.title}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Description"
                content={thought.description || ""}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
