import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import React, { useMemo, useState } from "react";
import { parseTaskText } from "./utils/parser";
import { addTaskViaApp } from "./utils/api";
import { Priority, type ParsedTask, type Tag } from "./types";

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.Low]: "#33D68F",
  [Priority.Medium]: "#FF930F",
  [Priority.High]: "#FF4594",
};

const TAG_COLOR_POOL = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#14B8A6",
  "#6366F1",
];

interface TagPreview {
  key: string;
  name: string;
  color: string;
}

export default function AddTask() {
  const [taskText, setTaskText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tags: Tag[] = []; // Tags will be fetched from the native app

  const parsed = useMemo(() => parseTaskText(taskText, tags), [taskText, tags]);
  const tagPreviews = useMemo(() => buildTagPreviews(parsed.detectedTags, tags), [parsed.detectedTags, tags]);
  const priorityPreview = parsed.priority ? buildPriorityPreview(parsed.priority) : null;
  const dueDatePreview = parsed.dueDate ? buildDueDatePreview(parsed.dueDate) : null;
  const hasInput = taskText.trim().length > 0;
  const cleanedTitle = parsed.cleanedText.trim();

  const accessories = useMemo(() => {
    const parts: List.Item.Accessory[] = [];

    if (priorityPreview) {
      parts.push({ tag: { value: priorityPreview.label, color: priorityPreview.color } });
    }

    if (dueDatePreview) {
      parts.push({ tag: { value: dueDatePreview.label, color: dueDatePreview.color } });
    }

    tagPreviews.slice(0, 3).forEach((tag) => {
      parts.push({ tag: { value: tag.name, color: tag.color } });
    });

    return parts;
  }, [priorityPreview, dueDatePreview, tagPreviews]);

  async function handleSubmit() {
    if (!cleanedTitle) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Required",
        message: "Please enter a task",
      });
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task...",
    });

    try {
      await addTaskViaApp(parsed);
      toast.style = Toast.Style.Success;
      toast.title = "Task Created";
      toast.message = cleanedTitle;
      setTaskText("");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Create Task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <List
      isShowingDetail={hasInput}
      throttle
      searchBarPlaceholder="What needs to be done? (Use #tags, @priority, /dates)"
      searchText={taskText}
      onSearchTextChange={setTaskText}
    >
      {!hasInput ? (
        <List.EmptyView
          icon={Icon.TextDocument}
          title="Type to build a task"
          description="Use #tags, @priority, and /dates to see the smart prediction"
        />
      ) : (
        <List.Section title="Smart Prediction">
          <List.Item
            id="prediction"
            title={cleanedTitle || "Prediction unavailable"}
            subtitle={cleanedTitle ? undefined : "Add a bit more detail to create a task title"}
            icon={Icon.Stars}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={buildPredictionMarkdown(parsed)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Clean Title"
                      text={cleanedTitle || "—"}
                      icon={Icon.Pencil}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Raw Input"
                      text={taskText || "—"}
                      icon={Icon.TextDocument}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Priority">
                      {priorityPreview ? (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={priorityPreview.label}
                          color={priorityPreview.color}
                        />
                      ) : (
                        <List.Item.Detail.Metadata.TagList.Item text="None" color="#94A3B8" />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Due Date">
                      {dueDatePreview ? (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={dueDatePreview.label}
                          color={dueDatePreview.color}
                        />
                      ) : (
                        <List.Item.Detail.Metadata.TagList.Item text="None" color="#94A3B8" />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {tagPreviews.length > 0 ? (
                        tagPreviews.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag.key} text={tag.name} color={tag.color} />
                        ))
                      ) : (
                        <List.Item.Detail.Metadata.TagList.Item text="None" color="#94A3B8" />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {cleanedTitle && !isSubmitting && (
                  <Action
                    title="Add Task"
                    icon={Icon.Plus}
                    onAction={handleSubmit}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                )}
                <Action
                  title="Clear Input"
                  icon={Icon.Trash}
                  onAction={() => setTaskText("")}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function buildPredictionMarkdown(parsed: ParsedTask): string {
  const lines: string[] = [];

  if (parsed.priority) {
    lines.push(`- 🚩 Priority: **${capitalize(parsed.priority)}**`);
  }

  if (parsed.dueDate) {
    lines.push(`- 📅 Due: **${formatRelativeDate(parsed.dueDate)}**`);
  }

  if (parsed.detectedTags.length > 0) {
    lines.push(`- 🏷️ Tags: ${parsed.detectedTags.map((tag) => `\`${tag}\``).join(" ")}`);
  }

  if (parsed.matchedKeywords.length > 0) {
    lines.push(`- 🤖 Signals: ${parsed.matchedKeywords.map((keyword) => `\`${keyword}\``).join(" ")}`);
  }

  const header = parsed.cleanedText.trim()
    ? `### ✨ Prediction\n${parsed.cleanedText.trim()}`
    : "### ✨ Prediction\nAdd a little more detail to see the prediction.";

  return lines.length > 0 ? `${header}\n\n${lines.join("\n")}` : header;
}

function buildPriorityPreview(priority: Priority) {
  return {
    label: capitalize(priority),
    color: PRIORITY_COLORS[priority],
  };
}

function buildDueDatePreview(date: Date) {
  return {
    label: formatRelativeDate(date),
    color: isOverdue(date) ? "#EF4444" : "#94A3B8",
  };
}

function buildTagPreviews(detectedTags: string[], availableTags: Tag[]): TagPreview[] {
  const seen = new Set<string>();

  return detectedTags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const lower = tag.toLowerCase();
      if (seen.has(lower)) {
        return false;
      }
      seen.add(lower);
      return true;
    })
    .map((tag, index) => {
      const normalized = tag.replace(/^#/, "");
      const matchingTag = availableTags.find((t) => t.name.toLowerCase() === normalized.toLowerCase());
      const displayName = matchingTag?.name ?? normalized;
      const color = matchingTag?.colorHex ?? getFallbackTagColor(normalized, index);

      return {
        key: `${normalized.toLowerCase()}-${color}`,
        name: displayName,
        color,
      };
    });
}

function getFallbackTagColor(tagName: string, seed: number) {
  const hash = Math.abs(stringHash(`${tagName}-${seed}`));
  return TAG_COLOR_POOL[hash % TAG_COLOR_POOL.length];
}

function stringHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function capitalize(text: string) {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatRelativeDate(date: Date) {
  if (isToday(date)) {
    return "Today";
  }
  if (isTomorrow(date)) {
    return "Tomorrow";
  }
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function isToday(date: Date) {
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() === today.getTime();
}

function isTomorrow(date: Date) {
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfDay(date).getTime() === tomorrow.getTime();
}

function isOverdue(date: Date) {
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() < today.getTime();
}

function startOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}
