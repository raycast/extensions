import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import { getActiveWorkspaceOrThrow } from "./workspace";

const DAILY_FOLDER = "Daily";
const DATE_FORMAT = "yyyy-MM-dd";
const TIME_FORMAT = "HH:mm";
const TASK_LINE_PATTERN = /^\s*-\s\[( |x|X)\]\s*(.*)$/;

interface SectionBounds {
  headingStart: number;
  contentStart: number;
  contentEnd: number;
}

export interface DailyTask {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Returns the path to today's daily note.
 */
async function getTodayNotePath(): Promise<string> {
  const workspacePath = await getActiveWorkspaceOrThrow();
  const today = format(new Date(), DATE_FORMAT);
  return path.join(workspacePath, DAILY_FOLDER, `${today}.md`);
}

/**
 * Creates a new daily note matching Octarine's template.
 */
function createDailyNoteTemplate(): string {
  return `## Focus

- \u200B

## Tasks

- [ ] 

## Journal

- \u200B

---
`;
}

function findSectionBounds(
  content: string,
  heading: string,
): SectionBounds | null {
  const headingPattern = new RegExp(`^## ${heading}\\s*$`, "m");
  const headingMatch = headingPattern.exec(content);

  if (!headingMatch) {
    return null;
  }

  const contentStart = headingMatch.index + headingMatch[0].length;
  const remainingContent = content.slice(contentStart);
  const boundaryPattern = /^(## |---)/m;
  const boundaryMatch = boundaryPattern.exec(remainingContent);
  const contentEnd = boundaryMatch
    ? contentStart + boundaryMatch.index
    : content.length;

  return {
    headingStart: headingMatch.index,
    contentStart,
    contentEnd,
  };
}

function insertSectionAtEnd(
  content: string,
  heading: string,
  entry: string,
): string {
  const separatorIdx = content.lastIndexOf("\n---");

  if (separatorIdx !== -1) {
    return (
      content.slice(0, separatorIdx).trimEnd() +
      `\n\n## ${heading}\n\n${entry}\n\n` +
      content.slice(separatorIdx)
    );
  }

  return content.trimEnd() + `\n\n## ${heading}\n\n${entry}\n`;
}

function replaceEmptyJournalPlaceholder(sectionContent: string): string {
  const placeholderPattern = /\n- \u200B\s*$/;
  return sectionContent.replace(placeholderPattern, "");
}

function replaceEmptyTaskPlaceholder(sectionContent: string): string {
  const placeholderPattern = /\n- \[[ xX]\]\s*$/;
  return sectionContent.replace(placeholderPattern, "");
}

async function loadTodayNoteContent(): Promise<{
  notePath: string;
  content: string;
}> {
  const notePath = await getTodayNotePath();

  try {
    const content = await fs.readFile(notePath, "utf-8");
    return { notePath, content };
  } catch {
    return { notePath, content: createDailyNoteTemplate() };
  }
}

async function saveTodayNote(notePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(notePath), { recursive: true });
  await fs.writeFile(notePath, content, "utf-8");
}

/**
 * Appends a timestamped thought to the ## Journal section of today's daily note.
 * Creates the note from template if it doesn't exist.
 */
export async function appendToJournal(text: string): Promise<void> {
  const timestamp = format(new Date(), TIME_FORMAT);
  const { notePath, content } = await loadTodayNoteContent();

  const entry = `- ${timestamp} - ${text}`;
  const newContent = insertIntoJournalSection(content, entry);

  await saveTodayNote(notePath, newContent);
}

/**
 * Appends a new checkbox task to the ## Tasks section of today's daily note.
 */
export async function appendToTasks(text: string): Promise<void> {
  const { notePath, content } = await loadTodayNoteContent();
  const entry = `- [ ] ${text}`;
  const newContent = insertIntoTasksSection(content, entry);
  await saveTodayNote(notePath, newContent);
}

/**
 * Returns all checkbox tasks in today's ## Tasks section.
 */
export async function getTodayTasks(): Promise<DailyTask[]> {
  const { content } = await loadTodayNoteContent();
  const taskSection = findSectionBounds(content, "Tasks");

  if (!taskSection) {
    return [];
  }

  const taskLines = content
    .slice(taskSection.contentStart, taskSection.contentEnd)
    .split("\n");
  const tasks: DailyTask[] = [];

  for (const line of taskLines) {
    const match = TASK_LINE_PATTERN.exec(line);
    if (!match) {
      continue;
    }

    const text = match[2].trim();
    if (!text) {
      continue;
    }

    tasks.push({
      id: String(tasks.length),
      text,
      completed: match[1].toLowerCase() === "x",
    });
  }

  return tasks;
}

/**
 * Toggles the completion state of a task in today's ## Tasks section by id.
 */
export async function toggleTodayTask(taskId: string): Promise<void> {
  const targetIndex = Number(taskId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0) {
    throw new Error("Invalid task id");
  }

  const { notePath, content } = await loadTodayNoteContent();
  const taskSection = findSectionBounds(content, "Tasks");

  if (!taskSection) {
    throw new Error("No Tasks section found in today's note");
  }

  const taskLines = content
    .slice(taskSection.contentStart, taskSection.contentEnd)
    .split("\n");
  let taskCounter = 0;
  let didToggle = false;

  const updatedTaskLines = taskLines.map((line) => {
    const match = TASK_LINE_PATTERN.exec(line);
    if (!match) {
      return line;
    }

    const text = match[2].trim();
    if (!text) {
      return line;
    }

    if (taskCounter !== targetIndex) {
      taskCounter += 1;
      return line;
    }

    taskCounter += 1;
    didToggle = true;

    return line.replace(
      /^(\s*-\s\[)( |x|X)(\]\s*.*)$/,
      (_value, prefix: string, status: string, suffix: string) => {
        const nextStatus = status.toLowerCase() === "x" ? " " : "x";
        return `${prefix}${nextStatus}${suffix}`;
      },
    );
  });

  if (!didToggle) {
    throw new Error("Task not found in today's note");
  }

  const updatedSection = updatedTaskLines.join("\n");
  const updatedContent =
    content.slice(0, taskSection.contentStart) +
    updatedSection +
    content.slice(taskSection.contentEnd);

  await saveTodayNote(notePath, updatedContent);
}

/**
 * Inserts an entry at the end of the ## Journal section.
 *
 * Strategy:
 *  1. Find "## Journal"
 *  2. Find the end of that section (next ## heading, --- separator, or EOF)
 *  3. Insert the new bullet right before the section boundary
 */
function insertIntoJournalSection(content: string, entry: string): string {
  const journalSection = findSectionBounds(content, "Journal");

  if (!journalSection) {
    return insertSectionAtEnd(content, "Journal", entry);
  }

  const before = replaceEmptyJournalPlaceholder(
    content.slice(0, journalSection.contentEnd).trimEnd(),
  );
  const after = content.slice(journalSection.contentEnd);
  return `${before}\n${entry}\n\n${after}`;
}

/**
 * Inserts a checkbox entry at the end of the ## Tasks section.
 * If Tasks doesn't exist, inserts it before Journal when available.
 */
function insertIntoTasksSection(content: string, entry: string): string {
  const taskSection = findSectionBounds(content, "Tasks");

  if (!taskSection) {
    const journalSection = findSectionBounds(content, "Journal");
    if (journalSection) {
      const before = content.slice(0, journalSection.headingStart).trimEnd();
      const after = content.slice(journalSection.headingStart);
      return `${before}\n\n## Tasks\n\n${entry}\n\n${after}`;
    }

    return insertSectionAtEnd(content, "Tasks", entry);
  }

  const before = replaceEmptyTaskPlaceholder(
    content.slice(0, taskSection.contentEnd).trimEnd(),
  );
  const after = content.slice(taskSection.contentEnd);
  return `${before}\n${entry}\n\n${after}`;
}
