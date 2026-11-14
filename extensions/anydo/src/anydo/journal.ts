import { appendFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { LocalStorage } from "@raycast/api";

import { dueDate } from "./format";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  toPersianDigits,
} from "./jalali";
import type { CompletedEntry } from "./history";
import {
  logDirectory,
  logEnabled,
  notionCredentials,
  notionEnabled,
} from "./prefs";
import {
  renderArchive,
  type ArchiveInput,
  type RenderedArchive,
} from "./archive";
import { loadReportFont } from "./font";
import { parseNote, priorityLabel } from "./tags";
import type { AnyDoTask } from "./types";

const FILE_NAME = "anydo-completed.md";
const DAILY_FILE_NAME = "anydo-daily.md";
const DAILY_STATE_KEY = "anydo:daily-log";

/** Appends the completed task to a markdown file. Best effort: never throws. */
export async function journalToFile(
  task: AnyDoTask,
  listName?: string,
): Promise<boolean> {
  if (!logEnabled()) return false;
  const directory = logDirectory();
  if (!directory) return false;

  try {
    await mkdir(directory, { recursive: true });
    const due = dueDate(task);
    const meta = parseNote(task.note);
    const stamp = new Date().toLocaleString("en-CA");
    const extras = [
      listName ? ` · ${listName}` : "",
      due ? ` · ${formatJalaliDateTime(due, Boolean(task.datetime))}` : "",
      meta.priority > 0 ? ` · ${priorityLabel(meta.priority)}` : "",
      meta.tags.length > 0
        ? ` · ${meta.tags.map((tag) => `#${tag}`).join(" ")}`
        : "",
    ].join("");
    await appendFile(
      join(directory, FILE_NAME),
      `- ${stamp} — **${task.title}**${extras}\n`,
      "utf8",
    );
    return true;
  } catch {
    return false;
  }
}

interface NotionPropertyPayload {
  [key: string]: unknown;
}

async function notionRequest(token: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Creates a page in the configured Notion database. Tries the common title property names. */
export async function journalToNotion(
  task: AnyDoTask,
  listName?: string,
): Promise<boolean> {
  if (!notionEnabled()) return false;
  const credentials = notionCredentials();
  if (!credentials) return false;

  const due = dueDate(task);
  const meta = parseNote(task.note);
  const summary = [
    listName ?? "",
    due ? formatJalaliDateTime(due, Boolean(task.datetime)) : "",
    meta.priority > 0 ? priorityLabel(meta.priority) : "",
    meta.tags.map((tag) => `#${tag}`).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");

  const titlePayload = (name: string): NotionPropertyPayload => ({
    [name]: { title: [{ text: { content: task.title } }] },
  });

  const base = {
    parent: { database_id: credentials.databaseId },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: summary } }],
        },
      },
    ],
  };

  if (
    await notionRequest(credentials.token, {
      ...base,
      properties: titlePayload("Name"),
    })
  )
    return true;
  if (
    await notionRequest(credentials.token, {
      ...base,
      properties: titlePayload("Title"),
    })
  )
    return true;
  return notionRequest(credentials.token, {
    ...base,
    properties: titlePayload("نام"),
  });
}

export async function journalCompleted(
  task: AnyDoTask,
  listName?: string,
): Promise<void> {
  const [file, notion] = await Promise.all([
    journalToFile(task, listName),
    journalToNotion(task, listName),
  ]);
  if (file || notion) {
    console.log(
      `[anydo] journalled "${task.title}" file=${file} notion=${notion}`,
    );
  }
}

export interface DailySummaryInput {
  open: AnyDoTask[];
  overdue: AnyDoTask[];
  completedToday: CompletedEntry[];
  now: Date;
}

/** End-of-day summary: one section per day in `anydo-daily.md` (written at most once per day). */
export async function writeDailySummary({
  open,
  overdue,
  completedToday,
  now,
}: DailySummaryInput): Promise<boolean> {
  if (!logEnabled()) return false;
  const directory = logDirectory();
  if (!directory) return false;

  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if ((await LocalStorage.getItem<string>(DAILY_STATE_KEY)) === key)
    return false;

  try {
    await mkdir(directory, { recursive: true });
    const lines: string[] = [];
    lines.push(
      `\n## ${formatJalaliDate(now)} — ${new Date().toLocaleString("en-CA")}`,
    );
    lines.push(
      `- انجام‌شده امروز: ${toPersianDigits(completedToday.length)} · باز: ${toPersianDigits(
        open.length,
      )} · عقب‌افتاده: ${toPersianDigits(overdue.length)}`,
    );
    if (completedToday.length > 0) {
      lines.push("- کارهای تمام‌شده:");
      for (const entry of completedToday) lines.push(`  - ${entry.title}`);
    }
    if (overdue.length > 0) {
      lines.push("- عقب‌افتاده‌ها:");
      for (const task of overdue) {
        const due = dueDate(task);
        lines.push(
          `  - ${task.title}${due ? ` (${formatJalaliDate(due)})` : ""}`,
        );
      }
    }
    lines.push("- فهرست باز:");
    for (const task of open.slice(0, 30)) {
      const due = dueDate(task);
      const meta = parseNote(task.note);
      lines.push(
        `  - ${task.title}${due ? ` (${formatJalaliDateTime(due, Boolean(task.datetime))})` : ""}${
          meta.priority > 0 ? ` · ${priorityLabel(meta.priority)}` : ""
        }`,
      );
    }

    await appendFile(
      join(directory, DAILY_FILE_NAME),
      `${lines.join("\n")}\n`,
      "utf8",
    );
    await LocalStorage.setItem(DAILY_STATE_KEY, key);
    return true;
  } catch {
    return false;
  }
}
// --- monthly archive --------------------------------------------------------

/** Writes the archived month next to the other logs (`anydo-archive-YYYY-MM.md` + `.html`). */
export async function writeMonthlyArchive(
  input: ArchiveInput,
): Promise<(RenderedArchive & { mdPath: string; htmlPath: string }) | null> {
  const directory = logDirectory();
  if (!directory) return null;

  const font = await loadReportFont();
  const rendered = renderArchive({
    ...input,
    font: font.family,
    fontDataUrl: font.dataUrl,
  });
  const mdPath = join(directory, `anydo-archive-${rendered.key}.md`);
  const htmlPath = join(directory, `anydo-archive-${rendered.key}.html`);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(mdPath, `${rendered.markdown}\n`, "utf8");
    await writeFile(htmlPath, rendered.html, "utf8");
    return { ...rendered, mdPath, htmlPath };
  } catch {
    return null;
  }
}
