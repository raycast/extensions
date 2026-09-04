import * as fs from "fs";
import * as path from "path";

export interface Subtask {
  title: string;
  done: boolean;
}

export interface Task {
  pomodoros: number;
  title: string;
  subtasks: Subtask[];
  done: boolean;
}

export interface TimeBlock {
  name: string;
  timeRange: string;
  targetPomodoros: number;
  tasks: Task[];
  isBreak: boolean;
}

export interface ParseOptions {
  timetableHeader: string;
  breakKeywords: string[];
}

export const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD.md";

/**
 * Get today's daily note file path.
 *
 * `format` is a path relative to `dailyNoteDir` in which `YYYY`, `MM` and `DD`
 * are replaced with today's date, e.g. "YYYY-MM-DD.md" or "YYYYMM/YYYY-MM-DD.md".
 */
export function getDailyNotePath(
  dailyNoteDir: string,
  format: string = DEFAULT_DAILY_NOTE_FORMAT,
): string {
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const relativePath = (format.trim() || DEFAULT_DAILY_NOTE_FORMAT)
    .replace(/YYYY/g, yyyy)
    .replace(/MM/g, mm)
    .replace(/DD/g, dd);
  return path.join(
    dailyNoteDir.replace(/^~/, process.env.HOME || ""),
    relativePath,
  );
}

function headingLevel(header: string): number {
  return header.match(/^#+/)?.[0].length ?? 1;
}

/**
 * Whether a line is exactly the configured heading (ignoring surrounding
 * whitespace), so "# Timetable" never matches "# Timetable Archive".
 */
export function isHeadingLine(line: string, header: string): boolean {
  return line.trim() === header.trim();
}

/**
 * [start, end) line range of the timetable section body, or null if the
 * header is not found. The section ends at the next heading of the same or
 * higher level as the timetable header.
 */
export function findTimetableRange(
  lines: string[],
  timetableHeader: string,
): [number, number] | null {
  const level = headingLevel(timetableHeader);
  const start = lines.findIndex((l) => isHeadingLine(l, timetableHeader));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length) {
    const heading = lines[end].match(/^(#{1,6}) /);
    if (heading && heading[1].length <= level) break;
    end++;
  }
  return [start + 1, end];
}

/**
 * Parse the timetable section from a daily note markdown file.
 */
export function parseTimetable(
  filePath: string,
  options: ParseOptions,
): TimeBlock[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const range = findTimetableRange(lines, options.timetableHeader);
  if (!range) return [];

  // Time blocks sit one heading level below the timetable header.
  const blockLevel = headingLevel(options.timetableHeader) + 1;
  return parseBlocks(
    lines.slice(range[0], range[1]),
    options.breakKeywords,
    blockLevel,
  );
}

function parseBlocks(
  lines: string[],
  breakKeywords: string[],
  blockLevel: number,
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentBlock: TimeBlock | null = null;
  let currentTask: Task | null = null;
  // Match block headers: ## Morning (10:00~12:00) 4p
  const blockRe = new RegExp(
    `^#{${blockLevel}} (.+?)(?:\\s+\\((.+?)\\))?\\s*(?:(\\d+)p)?$`,
  );

  for (const line of lines) {
    const blockMatch = line.match(blockRe);
    if (blockMatch) {
      if (currentBlock) {
        if (currentTask) currentBlock.tasks.push(currentTask);
        blocks.push(currentBlock);
        currentTask = null;
      }

      const name = blockMatch[1].trim();
      const timeRange = blockMatch[2] || "";
      const target = blockMatch[3] ? parseInt(blockMatch[3]) : 0;
      const isBreak = breakKeywords.some((kw) => name.includes(kw));

      currentBlock = {
        name,
        timeRange,
        targetPomodoros: target,
        tasks: [],
        isBreak,
      };
      continue;
    }

    if (!currentBlock || currentBlock.isBreak) continue;

    // Match task lines: - 2p #482 : ... or - 2p [done] #482 : ...
    const taskMatch = line.match(/^- (\d+)p\s+(?:\[done\]\s+)?(.+)$/);
    if (taskMatch) {
      if (currentTask) currentBlock.tasks.push(currentTask);
      const isDone = /^- \d+p\s+\[done\]/.test(line);
      currentTask = {
        pomodoros: parseInt(taskMatch[1]),
        title: stripMarkdownLinks(taskMatch[2].trim()),
        subtasks: [],
        done: isDone,
      };
      continue;
    }

    // Match subtask lines (indented with tab or spaces):
    //   - Review design feedback  or  - [done] Review design feedback
    const subtaskMatch = line.match(/^(?:\t| {2,})- (?:\[done\]\s+)?(.+)$/);
    if (subtaskMatch && currentTask) {
      const isSubDone = /^(?:\t| {2,})- \[done\]/.test(line);
      currentTask.subtasks.push({
        title: stripMarkdownLinks(subtaskMatch[1].trim()),
        done: isSubDone,
      });
    }
  }

  // Push last task and block
  if (currentBlock) {
    if (currentTask) currentBlock.tasks.push(currentTask);
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Strip markdown links: [#482](https://...) -> #482
 */
export function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
