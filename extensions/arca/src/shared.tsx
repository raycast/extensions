import { useState, useEffect } from "react";
import TurndownService from "turndown";
import { Action, ActionPanel, Clipboard, Color, Detail, Icon, Image, List, showToast, Toast } from "@raycast/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Assignee = { id: number; name: string; avatar_url: string | null };
export type Label = { id: number; name: string; color: string | null };
export type Status = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  category: string;
};
export type Task = {
  id: number;
  workspace_id: number;
  list_id: number | null;
  title: string;
  description: string | null;
  priority: string;
  identifier: number;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  status: Status | null;
  assignees: Assignee[];
  labels?: Label[];
};
export type Workspace = { id: number; name: string; slug: string };

// ── Constants ─────────────────────────────────────────────────────────────────

export const BASE_URL = "https://api.getarca.app/api/v1";

export const DONE_CATEGORIES = new Set(["done", "completed", "cancelled"]);

export const PRIORITY_COLOR: Record<string, Color> = {
  urgent: Color.Red,
  high: Color.SecondaryText,
  medium: Color.SecondaryText,
  low: Color.SecondaryText,
  none: Color.SecondaryText,
};

export const PRIORITY_ICON: Record<string, Icon> = {
  urgent: Icon.FullSignal,
  high: Icon.Signal3,
  medium: Icon.Signal2,
  low: Icon.Signal1,
  none: Icon.Signal0,
};

export const STATUS_CATEGORY_COLOR: Record<string, Color> = {
  pending: Color.SecondaryText,
  in_progress: Color.Orange,
  completed: Color.Green,
  cancelled: Color.Red,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

// Task list items: `- [ ] text` or `- [x] text`
turndown.addRule("taskItem", {
  filter: (node) => node.nodeName === "LI" && (node as Element).getAttribute("data-type") === "taskItem",
  replacement: (_content, node) => {
    const checked = (node as Element).getAttribute("data-checked") === "true";
    // Strip nested list markers that turndown may have inserted, keep only text
    const text = _content.replace(/^\s*[-*]\s+/, "").trim();
    return `- [${checked ? "x" : " "}] ${text}\n`;
  },
});

// Skip the <label> and <input> inside task items (they are UI chrome, not content)
turndown.addRule("taskItemLabel", {
  filter: ["label", "input"],
  replacement: () => "",
});

// Strikethrough: <s> / <del>
turndown.addRule("strikethrough", {
  filter: ["s", "del"],
  replacement: (content) => `~~${content}~~`,
});

// Highlight: <mark>
turndown.addRule("highlight", {
  filter: ["mark"],
  replacement: (content) => `==${content}==`,
});

// Callout: <div data-callout data-callout-type="info|warning|success|error">
turndown.addRule("callout", {
  filter: (node) => node.nodeName === "DIV" && (node as Element).hasAttribute("data-callout"),
  replacement: (content, node) => {
    const typeMap: Record<string, string> = {
      info: "NOTE",
      warning: "WARNING",
      success: "TIP",
      error: "CAUTION",
    };
    const rawType = (node as Element).getAttribute("data-callout-type") ?? "info";
    const marker = typeMap[rawType.toLowerCase()] ?? rawType.toUpperCase();
    const quoted = content
      .trim()
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    return `> [!${marker}]\n${quoted}\n\n`;
  },
});

// Collapsible: <div data-type="collapsible">
turndown.addRule("collapsible", {
  filter: (node) => node.nodeName === "DIV" && (node as Element).getAttribute("data-type") === "collapsible",
  replacement: (content) => `<details>\n${content.trim()}\n</details>\n\n`,
});

// Link preview card: <a data-type="link-preview-card" data-url="..." data-title="...">
turndown.addRule("linkPreviewCard", {
  filter: (node) => node.nodeName === "A" && (node as Element).getAttribute("data-type") === "link-preview-card",
  replacement: (_, node) => {
    const el = node as Element;
    const url = el.getAttribute("data-url") ?? "";
    const title = el.getAttribute("data-title") ?? url;
    return `[${title}](${url})`;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}

export async function fetchTaskDescription(taskId: number, apiKey: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.description ?? null;
}

export function taskRef(task: Task, slugMap: Map<number, string>): string {
  const slug = slugMap.get(task.workspace_id);
  return slug ? `${slug.toUpperCase()}-${task.identifier}` : `#${task.identifier}`;
}

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (withTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  return new Date(iso).toLocaleDateString(undefined, options);
}

// ── Shared components ─────────────────────────────────────────────────────────

export function TaskDetail({
  task: initialTask,
  slugMap,
  apiKey,
}: {
  task: Task;
  slugMap: Map<number, string>;
  apiKey: string;
}) {
  const [task, setTask] = useState<Task>(initialTask);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/tasks/${initialTask.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTask(data);
      })
      .finally(() => setIsLoading(false));
  }, [initialTask.id]);

  const priority = task.priority || "none";
  const description = task.description ? htmlToMarkdown(task.description) : "_No description_";
  const markdown = `## ${task.title}\n\n${description}`.trim();

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={task.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Priority">
            <Detail.Metadata.TagList.Item
              text={priority.charAt(0).toUpperCase() + priority.slice(1)}
              color={PRIORITY_COLOR[priority] ?? Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          {task.status && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={task.status.name}
                color={STATUS_CATEGORY_COLOR[task.status.category] ?? Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Label title="Start date" text={formatDate(task.start_date)} />
          <Detail.Metadata.Label title="Due date" text={formatDate(task.due_date)} />
          {task.labels && task.labels.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Labels">
                {task.labels.map((l) => (
                  <Detail.Metadata.TagList.Item key={l.id} text={l.name} color={l.color ?? Color.SecondaryText} />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
          <Detail.Metadata.Separator />
          {task.assignees.map((a) => (
            <Detail.Metadata.Label
              key={a.id}
              title="Assignee"
              text={a.name}
              icon={
                a.avatar_url
                  ? { source: a.avatar_url, mask: Image.Mask.Circle }
                  : { source: Icon.Person, tintColor: Color.SecondaryText }
              }
            />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Identifier" text={taskRef(task, slugMap)} />
          <Detail.Metadata.Label title="Created" text={formatDate(task.created_at)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Arca"
            url={`https://web.getarca.app/task?id=${task.id}`}
            icon={Icon.Globe}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy ID"
              content={taskRef(task, slugMap)}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={task.title}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action.CopyToClipboard
              title="Copy Description"
              content={task.description ? htmlToMarkdown(task.description) : ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.CopyToClipboard
              title="Copy as Prompt"
              content={`Start implementation of the following Arca task:\n\nTask ID: ${taskRef(task, slugMap)}\nTask Title: ${task.title}\n\nDescription:\n${task.description ? htmlToMarkdown(task.description) : "N/A"}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function TaskItem({
  task,
  slugMap,
  apiKey,
  showCompleted,
  onToggleCompleted,
}: {
  task: Task;
  slugMap: Map<number, string>;
  apiKey: string;
  showCompleted: boolean;
  onToggleCompleted: () => void;
}) {
  const priority = task.priority || "none";

  const accessories: List.Item.Accessory[] = [];
  if (task.status) {
    accessories.push({
      tag: {
        value: task.status.name,
        color: STATUS_CATEGORY_COLOR[task.status.category] ?? Color.SecondaryText,
      },
    });
  }
  for (const a of task.assignees.slice(0, 3)) {
    accessories.push({
      icon: a.avatar_url
        ? { source: a.avatar_url, mask: Image.Mask.Circle }
        : { source: Icon.Person, tintColor: Color.SecondaryText },
      tooltip: a.name,
    });
  }

  return (
    <List.Item
      title={task.title}
      subtitle={taskRef(task, slugMap)}
      keywords={[taskRef(task, slugMap)]}
      icon={{ source: PRIORITY_ICON[priority], tintColor: PRIORITY_COLOR[priority] ?? Color.SecondaryText }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<TaskDetail task={task} slugMap={slugMap} apiKey={apiKey} />}
          />
          <Action.OpenInBrowser
            title="Open in Arca"
            url={`https://web.getarca.app/task?id=${task.id}`}
            icon={Icon.Globe}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy ID"
              content={taskRef(task, slugMap)}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={task.title}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action
              title="Copy Description"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching description…" });
                const html = await fetchTaskDescription(task.id, apiKey);
                if (html == null) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to fetch description";
                  return;
                }
                await Clipboard.copy(html ? htmlToMarkdown(html) : "");
                toast.style = Toast.Style.Success;
                toast.title = "Copied description";
              }}
            />
            <Action
              title="Copy as Prompt"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching description…" });
                const html = await fetchTaskDescription(task.id, apiKey);
                const description = html ? htmlToMarkdown(html) : "N/A";
                await Clipboard.copy(
                  `Start implementation of the following Arca task:\n\nTask ID: ${taskRef(task, slugMap)}\nTask Title: ${task.title}\n\nDescription:\n${description}`,
                );
                toast.style = Toast.Style.Success;
                toast.title = "Copied prompt";
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
              icon={showCompleted ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={onToggleCompleted}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
