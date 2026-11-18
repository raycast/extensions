import * as chrono from "chrono-node";
import type { NewTaskValues } from "./tasknotes";

export type ParsedTaskInput = NewTaskValues & {
  tags?: string;
};

type ParseOptions = {
  defaultDateTarget?: "due" | "scheduled";
};

const priorityAliases: Record<string, string> = {
  p0: "highest",
  p1: "high",
  p2: "medium",
  p3: "low",
  p4: "lowest",
  urgent: "highest",
  highest: "highest",
  high: "high",
  medium: "medium",
  normal: "medium",
  low: "low",
  lowest: "lowest",
};

export function parseNaturalLanguageTask(
  input: string,
  referenceDate = new Date(),
  options: ParseOptions = {},
): ParsedTaskInput {
  let text = input.trim();
  const defaultDateTarget = options.defaultDateTarget ?? "scheduled";
  const details = extractDetails(text);
  text = details.text;

  const tags = extractTokens(text, /(^|\s)#([\p{L}\p{N}_/-]+)/gu);
  text = tags.text;

  const contexts = extractTokens(text, /(^|\s)@([\p{L}\p{N}_/-]+)/gu);
  text = contexts.text;

  const projects = extractProjects(text);
  text = projects.text;

  const priority = extractPriority(text);
  text = priority.text;

  const parsedDates = chrono.parse(text, referenceDate, { forwardDate: true });
  const due = firstDateFor(text, parsedDates, "due", defaultDateTarget);
  const scheduled = firstDateFor(text, parsedDates, "scheduled", defaultDateTarget);
  text = removeDateText(text, parsedDates);

  const title = normalizeTitle(text);

  return {
    title: title || input.trim(),
    details: details.details,
    priority: priority.priority,
    due,
    scheduled,
    contexts: contexts.values.join(", "),
    projects: projects.values.join(", "),
    tags: tags.values.join(", "),
  };
}

function extractDetails(text: string) {
  const match = text.match(/\s(?:--|\/\/)\s(.+)$/);
  if (match === null || match.index === undefined) return { text, details: undefined };

  return {
    text: text.slice(0, match.index).trim(),
    details: match[1].trim(),
  };
}

function extractTokens(text: string, pattern: RegExp) {
  const values: string[] = [];
  const next = text.replace(pattern, (_match, prefix: string, value: string) => {
    values.push(value);
    return prefix;
  });

  return {
    text: normalizeWhitespace(next),
    values: unique(values),
  };
}

function extractProjects(text: string) {
  const boundary = String.raw`(?=\s+(?:due|by|before|do|start|scheduled?|on|at|today|tomorrow|tonight|next|this|priority\b|p[0-4]\s+priority|urgent|highest|high|medium|normal|low|lowest)\b|\s[#@!]|\s(?:--|\/\/)\s|$)`;
  const patterns = [
    new RegExp(String.raw`(^|\s)(?:projects?|proj)[:=]\s*(.+?)${boundary}`, "giu"),
    new RegExp(String.raw`(^|\s)(?:in|for)\s+projects?\s+(.+?)${boundary}`, "giu"),
  ];
  const values: string[] = [];
  let next = text;

  for (const pattern of patterns) {
    next = next.replace(pattern, (_match, prefix: string, value: string) => {
      values.push(...splitProjectValues(value));
      return prefix;
    });
  }

  return {
    text: normalizeWhitespace(next),
    values: unique(values),
  };
}

function splitProjectValues(value: string) {
  return value
    .split(",")
    .map((part) => part.replace(/[.;:]$/g, "").trim())
    .filter(Boolean);
}

function extractPriority(text: string) {
  let priority: string | undefined;
  let next = text.replace(
    /\b(?:priority[:\s-]*)?(p[0-4]|urgent|highest|high|medium|normal|low|lowest)\s+priority\b/gi,
    (match, value) => {
      priority = priorityAliases[String(value).toLowerCase()];
      return "";
    },
  );

  next = next.replace(/\bpriority[:\s-]*(p[0-4]|urgent|highest|high|medium|normal|low|lowest)\b/gi, (match, value) => {
    priority = priorityAliases[String(value).toLowerCase()];
    return "";
  });

  next = next.replace(/\b!(p[0-4]|urgent|highest|high|medium|normal|low|lowest)\b/gi, (match, value) => {
    priority = priorityAliases[String(value).toLowerCase()];
    return "";
  });

  return {
    text: normalizeWhitespace(next),
    priority,
  };
}

function firstDateFor(
  text: string,
  dates: chrono.ParsedResult[],
  kind: "due" | "scheduled",
  defaultDateTarget: "due" | "scheduled",
) {
  const lower = text.toLowerCase();
  const result = dates.find((date) => {
    const prefix = lower.slice(Math.max(0, date.index - 16), date.index);
    const isScheduled = /\b(do|start|scheduled?|on|at)\s*$/i.test(prefix);
    const isDue = /\b(due|by|before)\s*$/i.test(prefix);

    if (isDue) return kind === "due";
    if (isScheduled) return kind === "scheduled";
    return kind === defaultDateTarget;
  });

  return result?.start.date();
}

function removeDateText(text: string, dates: chrono.ParsedResult[]) {
  let next = text;
  for (const date of dates.toReversed()) {
    const start = Math.max(0, date.index - datePrefixLength(text, date.index));
    next = `${next.slice(0, start)} ${next.slice(date.index + date.text.length)}`;
  }

  return normalizeWhitespace(next);
}

function datePrefixLength(text: string, dateIndex: number) {
  const before = text.slice(0, dateIndex);
  const match = before.match(/\b(?:due|by|before|do|start|scheduled?|on|at)\s+$/i);
  return match ? match[0].length : 0;
}

function normalizeTitle(text: string) {
  return normalizeWhitespace(
    text.replace(/^(add|create|capture|remind me to|remember to|todo|task)\b[:\s-]*/i, "").replace(/\s+[,;:]$/g, ""),
  );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
