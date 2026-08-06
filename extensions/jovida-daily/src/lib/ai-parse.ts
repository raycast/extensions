import { AI, environment } from "@raycast/api";
import { toLocalISO } from "./format";
import { Priority } from "./types";

export interface ParsedTodo {
  title: string;
  when: string | null;
  allDay: boolean;
  reminders: string[];
  phoneReminder: boolean;
  priority: Priority;
  category: string | null;
  subtasks: string[];
  description: string | null;
}

export function canUseAI(): boolean {
  return environment.canAccess(AI);
}

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

// Use Raycast AI to decompose a free-text note into structured todo fields.
export async function parseTodoWithAI(text: string): Promise<ParsedTodo> {
  if (!canUseAI()) {
    throw new Error("Raycast AI is not available (requires Raycast Pro).");
  }

  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const prompt = `You convert a user's note into a SINGLE todo for a task app.
Current local datetime: ${toLocalISO(now)} (timezone: ${tz}). Resolve relative dates/times ("tomorrow", "next Friday 3pm") against this.

Return ONLY a JSON object — no markdown, no commentary — with exactly these keys:
- "title": string. A concise, imperative title.
- "when": string or null. Use ISO-8601 WITH timezone offset (e.g. "2026-06-27T15:00:00+08:00") for a precise deadline; use a bare "YYYY-MM-DD" if only a day is known; null if no date is implied.
- "allDay": boolean. true when only a day is known (no specific time), false when there is a precise time.
- "reminders": array of ISO-8601 datetimes WITH offset for when to nudge the user (e.g. "remind me at 9am" → ["2026-06-27T09:00:00+08:00"]). Each must be at or before "when". Use [] if no reminder is mentioned.
- "phoneReminder": boolean. true only when the user explicitly asks for a phone call / voice call reminder (e.g. "call me", "电话提醒", "打电话提醒我"). false otherwise.
- "priority": one of "none","low","medium","high". Infer urgency; default "none" if unclear.
- "category": short label like "work","personal","health","finance", or null.
- "subtasks": array of short step strings if the task naturally breaks into steps, else [].
- "description": extra detail not captured in the title, or null.

User note:
"""${text}"""`;

  const raw = await AI.ask(prompt, { creativity: "low" });
  let parsed: Partial<ParsedTodo>;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    throw new Error("AI returned an unparseable response — try rephrasing.");
  }

  const priority: Priority = (
    ["none", "low", "medium", "high"] as const
  ).includes(parsed.priority as Priority)
    ? (parsed.priority as Priority)
    : "none";

  return {
    title: (parsed.title ?? "").trim(),
    when: parsed.when ? String(parsed.when) : null,
    allDay: parsed.when ? Boolean(parsed.allDay) : true,
    reminders: Array.isArray(parsed.reminders)
      ? parsed.reminders.map((r) => String(r).trim()).filter(Boolean)
      : [],
    phoneReminder: Boolean(parsed.phoneReminder),
    priority,
    category: parsed.category ? String(parsed.category) : null,
    subtasks: Array.isArray(parsed.subtasks)
      ? parsed.subtasks.map((s) => String(s).trim()).filter(Boolean)
      : [],
    description: parsed.description ? String(parsed.description) : null,
  };
}
