import { extractDueDateFromText, formatDueDate } from "./parse-due-date";

export type ParsedQuickAddReminder = {
  title: string;
  description?: string;
  listId?: string;
  dueDate?: string;
  notes?: string;
  priority?: string;
  recurrence?: {
    frequency: string;
    interval: number;
    endDate?: string;
  };
  address?: string;
  proximity?: string;
  radius?: number;
};

export type QuickAddList = {
  id: string;
  title: string;
  isDefault?: boolean;
};

export function parseAIResponse(response: string): ParsedQuickAddReminder {
  const json = extractFirstJSONObject(response);
  if (!json) {
    throw new Error("Invalid result returned from AI");
  }

  const parsed = JSON.parse(json) as ParsedQuickAddReminder;
  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Invalid result returned from AI");
  }

  if (parsed.recurrence && !parsed.dueDate) {
    throw new Error("Recurrence without dueDate");
  }

  return parsed;
}

export function resolveQuickAddReminder(
  reminder: ParsedQuickAddReminder,
  inputText: string,
  lists: QuickAddList[],
  now: Date = new Date(),
): ParsedQuickAddReminder {
  const mentionedList = findListInText(inputText, lists) ?? findListInText(reminder.title, lists);
  let { title, listId, dueDate } = reminder;

  if (mentionedList) {
    listId = mentionedList.id;
    title = stripListMentions(title, mentionedList);
  }

  if (listId && !lists.some((list) => list.id === listId)) {
    listId = undefined;
  }

  if (!dueDate) {
    const extracted = extractDueDateFromText(inputText, now);
    if (extracted.dueDate) {
      dueDate = formatDueDate(extracted.dueDate);
      title = stripListMentions(extracted.title || title, mentionedList);
    }
  }

  return {
    ...reminder,
    title: title.replace(/\s+/g, " ").trim() || reminder.title.trim(),
    listId,
    dueDate,
  };
}

function extractFirstJSONObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < candidate.length; index++) {
    const character = candidate[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, index + 1);
      }
    }
  }

  return null;
}

function findListInText(text: string, lists: QuickAddList[]): QuickAddList | undefined {
  const sortedLists = [...lists].sort((a, b) => b.title.length - a.title.length);

  for (const list of sortedLists) {
    const escapedTitle = escapeRegExp(list.title);
    const patterns = [
      new RegExp(`(?:^|\\s)[#@]${escapedTitle}\\b`, "i"),
      new RegExp(`\\bin the ${escapedTitle} list\\b`, "i"),
      new RegExp(`\\bin ${escapedTitle} list\\b`, "i"),
    ];

    if (patterns.some((pattern) => pattern.test(text))) {
      return list;
    }
  }

  return undefined;
}

function stripListMentions(text: string, list?: QuickAddList): string {
  if (!list) {
    return text.replace(/\s+/g, " ").trim();
  }

  const escapedTitle = escapeRegExp(list.title);
  return text
    .replace(new RegExp(`(?:^|\\s)[#@]${escapedTitle}\\b`, "ig"), " ")
    .replace(new RegExp(`\\bin the ${escapedTitle} list\\b`, "ig"), " ")
    .replace(new RegExp(`\\bin ${escapedTitle} list\\b`, "ig"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
