import * as fs from "fs";
import {
  findTimetableRange,
  getDailyNotePath,
  parseTimetable,
  ParseOptions,
  stripMarkdownLinks,
} from "./parser";
import { getAppPreferences } from "./preferences";
import { TaskSource, TaskGroup } from "./task-source";

function lineMatchesTitle(line: string, title: string): boolean {
  const stripped = stripMarkdownLinks(line);
  return stripped.includes(title.substring(0, 20));
}

export class DailyNoteTaskSource implements TaskSource {
  private filePath: string;
  private parseOptions: ParseOptions;

  constructor() {
    const prefs = getAppPreferences();
    if (!prefs.dailyNotePath) {
      throw new Error("Daily Note Directory is required for Daily Note mode");
    }
    this.filePath = getDailyNotePath(
      prefs.dailyNotePath,
      prefs.dailyNoteFormat,
    );
    this.parseOptions = {
      timetableHeader: prefs.timetableHeader,
      breakKeywords: prefs.breakKeywords,
    };
  }

  async getTasks(): Promise<TaskGroup[]> {
    const blocks = parseTimetable(this.filePath, this.parseOptions);
    return blocks
      .filter((b) => !b.isBreak && b.tasks.length > 0)
      .map((b) => ({
        name: `${b.name}${b.timeRange ? ` (${b.timeRange})` : ""}`,
        tasks: b.tasks,
      }));
  }

  async markDone(taskTitle: string): Promise<void> {
    if (!fs.existsSync(this.filePath)) return;
    const content = fs.readFileSync(this.filePath, "utf-8");
    const lines = content.split("\n");
    // Only edit inside the timetable section so lines elsewhere in the note
    // (e.g. other sections mentioning the same task) are never touched.
    const range = findTimetableRange(lines, this.parseOptions.timetableHeader);
    if (!range) return;
    for (let i = range[0]; i < range[1]; i++) {
      const line = lines[i];
      if (
        line.match(/^- \d+p\s+/) &&
        !line.includes("[done]") &&
        lineMatchesTitle(line, taskTitle)
      ) {
        lines[i] = line.replace(/^(- \d+p\s+)/, "$1[done] ");
        fs.writeFileSync(this.filePath, lines.join("\n"), "utf-8");
        return;
      }
    }
  }

  async markSubtaskDone(
    taskTitle: string,
    subtaskTitle: string,
  ): Promise<void> {
    if (!fs.existsSync(this.filePath)) return;
    const content = fs.readFileSync(this.filePath, "utf-8");
    const lines = content.split("\n");
    const range = findTimetableRange(lines, this.parseOptions.timetableHeader);
    if (!range) return;
    let inTask = false;
    for (let i = range[0]; i < range[1]; i++) {
      const line = lines[i];
      if (line.match(/^- \d+p\s+/)) {
        inTask = lineMatchesTitle(line, taskTitle);
        continue;
      }
      if (/^#{1,6} /.test(line)) {
        inTask = false;
        continue;
      }
      if (
        inTask &&
        line.match(/^(?:\t| {2,})- /) &&
        !line.includes("[done]") &&
        lineMatchesTitle(line, subtaskTitle)
      ) {
        lines[i] = line.replace(/^((?:\t| {2,})- )/, "$1[done] ");
        fs.writeFileSync(this.filePath, lines.join("\n"), "utf-8");
        return;
      }
    }
  }
}
