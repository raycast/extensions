import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { createTask, createTag, getProjects, getTags } from "./api";
import type { Project, Tag } from "./types";
import { formatLocalDate, getTodayStr } from "./utils";

interface ParsedInput {
  title: string;
  projectId?: string;
  tagIds: string[];
  dueDay?: string;
  timeEstimate?: number;
  projectTitle?: string;
  tagTitles: string[];
  newTagTitles: string[];
}

function getNextDayOfWeek(dayAbbr: string): string {
  const days: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  const target = days[dayAbbr.toLowerCase()];
  if (target === undefined) return getTodayStr();

  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = target - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  today.setDate(today.getDate() + daysUntil);
  return formatLocalDate(today);
}

function parseDueDate(expr: string): string | undefined {
  const trimmed = expr.trim().toLowerCase();

  if (trimmed === "today") return getTodayStr();
  if (trimmed === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }
  if (trimmed === "next week") {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatLocalDate(d);
  }
  if (["sun", "mon", "tue", "wed", "thu", "fri", "sat"].includes(trimmed)) {
    return getNextDayOfWeek(trimmed);
  }
  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2];
    const d = isoMatch[3];
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (formatLocalDate(date) === trimmed) return trimmed;
  }
  // MM-DD (this year)
  const mdMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})$/);
  if (mdMatch) {
    const mo = mdMatch[1];
    const da = mdMatch[2];
    const year = new Date().getFullYear();
    const date = new Date(year, Number(mo) - 1, Number(da));
    const candidate = `${year}-${String(Number(mo)).padStart(2, "0")}-${String(Number(da)).padStart(2, "0")}`;
    if (formatLocalDate(date) === candidate) return candidate;
  }
  return undefined;
}

function parseTimeEstimate(token: string): { ms: number; consumed: string } | undefined {
  let remaining = token;
  let totalMs = 0;
  let consumed = "";

  while (true) {
    const match = remaining.match(/^([\d]+(\.[\d]+)?)\s*(h|m)\s*/i);
    if (!match) break;

    const value = parseFloat(match[1]);
    const unit = match[3].toLowerCase();
    totalMs += unit === "h" ? value * 3600000 : value * 60000;
    consumed += match[0];
    remaining = remaining.slice(match[0].length);
  }

  if (totalMs === 0) return undefined;
  return { ms: totalMs, consumed };
}

interface Token {
  type: "project" | "tag" | "due" | "time";
  raw: string;
  value: string;
  timeMs?: number;
}

function tokenize(input: string): { tokens: Token[]; title: string } {
  const projectRegex = /\s\+(\S+)/g;
  const tagRegex = /\s#(\S+)/g;
  const dueRegex = /(?:\s|^)@(\S+)/g;
  const deadlineRegex = /(?:\s|^)!(\S+)/g;
  const timeRegex = /(?:\s|^)([\d]+(\.[\d]+)?\s*(?:h|m)(?:\s*[\d]+(\.[\d]+)?\s*(?:h|m))*)/gi;

  // Collect all matches with positions
  const matches: {
    index: number;
    end: number;
    type: Token["type"];
    value: string;
    timeMs?: number;
  }[] = [];

  for (const match of input.matchAll(dueRegex)) {
    const expr = match[1];
    const dueDay = parseDueDate(expr);
    const value = dueDay || expr;
    matches.push({
      index: match.index!,
      end: match.index! + match[0].length,
      type: "due",
      value,
    });
  }

  for (const match of input.matchAll(deadlineRegex)) {
    matches.push({
      index: match.index!,
      end: match.index! + match[0].length,
      type: "due", // treat deadline same as due for task creation
      value: match[1],
    });
  }

  for (const match of input.matchAll(projectRegex)) {
    matches.push({
      index: match.index!,
      end: match.index! + match[0].length,
      type: "project",
      value: match[1],
    });
  }

  for (const match of input.matchAll(tagRegex)) {
    matches.push({
      index: match.index!,
      end: match.index! + match[0].length,
      type: "tag",
      value: match[1],
    });
  }

  for (const match of input.matchAll(timeRegex)) {
    const parsed = parseTimeEstimate(match[1]);
    if (parsed) {
      matches.push({
        index: match.index!,
        end: match.index! + match[0].length,
        type: "time",
        value: match[1],
        timeMs: parsed.ms,
      });
    }
  }

  // Sort by position, remove overlapping matches (keep first)
  matches.sort((a, b) => a.index - b.index);
  const nonOverlapping: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.index >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  }

  // Build title by removing token regions
  const sorted = [...nonOverlapping].sort((a, b) => a.index - b.index);
  let title = "";
  let cursor = 0;

  for (const m of sorted) {
    // Add text before this token
    title += input.slice(cursor, m.index);
    cursor = m.end;
  }
  // Add remaining text
  title += input.slice(cursor);

  // Clean up title: collapse whitespace, trim
  title = title.replace(/\s+/g, " ").trim();

  return {
    title,
    tokens: sorted.map((m) => ({
      type: m.type,
      raw: input.slice(m.index, m.end).trim(),
      value: m.value,
      timeMs: m.timeMs,
    })),
  };
}

function parseInput(input: string, projects: Project[], tags: Tag[]): ParsedInput {
  const { tokens, title } = tokenize(input);

  let projectId: string | undefined;
  let projectTitle: string | undefined;
  const tagIds: string[] = [];
  const tagTitles: string[] = [];
  const newTagTitles: string[] = [];
  let dueDay: string | undefined;
  let timeEstimate: number | undefined;

  for (const token of tokens) {
    switch (token.type) {
      case "project": {
        const match = findProject(token.value, projects);
        if (match) {
          projectId = match.id;
          projectTitle = match.title;
        }
        break;
      }
      case "tag": {
        const match = findTag(token.value, tags);
        if (match) {
          if (!tagIds.includes(match.id)) {
            tagIds.push(match.id);
            tagTitles.push(match.title);
          }
        } else {
          const alreadyTracked = [...tagTitles, ...newTagTitles].some(
            (t) => t.toLowerCase() === token.value.toLowerCase(),
          );
          if (!alreadyTracked) {
            newTagTitles.push(token.value);
          }
        }
        break;
      }
      case "due": {
        if (dueDay === undefined) {
          const parsed = parseDueDate(token.value);
          dueDay = parsed;
        }
        break;
      }
      case "time": {
        if (timeEstimate === undefined && token.timeMs) {
          timeEstimate = token.timeMs;
        }
        break;
      }
    }
  }

  return {
    title,
    projectId,
    tagIds,
    dueDay,
    timeEstimate,
    projectTitle,
    tagTitles,
    newTagTitles,
  };
}

function findProject(name: string, projects: Project[]): Project | undefined {
  if (name.length < 3) return undefined;
  const lower = name.toLowerCase();
  const matches = projects.filter((p) => p.title.toLowerCase().replace(/\s/g, "").startsWith(lower.replace(/\s/g, "")));
  if (matches.length === 0) return undefined;
  // Prefer shortest matching title
  matches.sort((a, b) => a.title.length - b.title.length);
  return matches[0];
}

function findTag(name: string, tags: Tag[]): Tag | undefined {
  const lower = name.toLowerCase();
  return tags.find((t) => t.title.toLowerCase() === lower);
}

function formatDueLabel(dueDay: string): string {
  const today = getTodayStr();
  if (dueDay === today) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dueDay === formatLocalDate(tomorrow)) return "Tomorrow";
  return dueDay;
}

function formatTimeEstimate(ms: number): string {
  const hours = ms / 3600000;
  if (hours >= 1) return `${hours}h`;
  return `${ms / 60000}m`;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [fp, ft] = await Promise.all([getProjects(), getTags()]);
        setProjects(fp);
        setTags(ft);
      } catch (e) {
        console.error("Failed to fetch:", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOptions();
  }, []);

  const parsed = input.trim() ? parseInput(input, projects, tags) : null;

  async function handleSubmit() {
    if (!parsed || !parsed.title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a task title",
        message: "Type your task, e.g. 'Buy milk +Shopping #groceries @tomorrow 30m'",
      });
      return;
    }

    try {
      // Auto-create any tags that don't exist yet
      const allTagIds = [...parsed.tagIds];

      for (const tagName of parsed.newTagTitles) {
        try {
          const newTag = await createTag({ title: tagName });
          allTagIds.push(newTag.id);
        } catch (error) {
          console.error(`Failed to create tag "${tagName}":`, error);
          throw error;
        }
      }

      await createTask({
        title: parsed.title,
        projectId: parsed.projectId,
        tagIds: allTagIds.length > 0 ? allTagIds : undefined,
        dueDay: parsed.dueDay,
        timeEstimate: parsed.timeEstimate,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: [
          parsed.title,
          parsed.newTagTitles.length > 0 &&
            `+${parsed.newTagTitles.length} tag${parsed.newTagTitles.length > 1 ? "s" : ""}`,
        ]
          .filter(Boolean)
          .join("  •  "),
      });
      popToRoot();
    } catch (e) {
      console.error("Failed to create task:", e);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="quickInput"
        title="Task"
        placeholder="e.g. Buy milk +Shopping #groceries @tomorrow 30m"
        autoFocus
        value={input}
        onChange={setInput}
      />
      {parsed && (
        <>
          <Form.Separator />
          <Form.Description
            title="Preview"
            text={
              [
                parsed.title && `📝 ${parsed.title}`,
                parsed.projectTitle && `📁 ${parsed.projectTitle}`,
                (parsed.tagTitles.length > 0 || parsed.newTagTitles.length > 0) &&
                  `🏷️ ${[...parsed.tagTitles.map((t) => `#${t}`), ...parsed.newTagTitles.map((t) => `+${t}`)].join(
                    ", ",
                  )}`,
                parsed.dueDay && `📅 ${formatDueLabel(parsed.dueDay)}`,
                parsed.timeEstimate && `⏱️ ${formatTimeEstimate(parsed.timeEstimate)}`,
              ]
                .filter(Boolean)
                .join("   •   ") || "No fields parsed"
            }
          />
          <Form.Description title="Syntax" text="+project   #tag   @today/@tomorrow/@fri/@2025-12-25   30m/1h/1.5h" />
        </>
      )}
      {!parsed && !isLoading && (
        <>
          <Form.Separator />
          <Form.Description
            title="Quick Syntax"
            text="+project   #tag   @today/@tomorrow/@fri/@2025-12-25   30m/1h/1.5h   30m/1h (spent/estimate)"
          />
        </>
      )}
    </Form>
  );
}
