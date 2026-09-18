import * as fs from "fs";
import {
  findTimetableRange,
  getDailyNotePath,
  parseTimetable,
  ParseOptions,
  subtaskLineTitle,
  taskLineTitle,
} from "./parser";
import { getAppPreferences } from "./preferences";
import { TaskSource, TaskGroup, MarkResult } from "./task-source";
import { withSessionLock } from "./lock";

const DONE_TASK_RE = /^- \d+p\s+\[done\]/;
const DONE_SUBTASK_RE = /^(?:\t| {2,})- \[done\]/;

export class DailyNoteTaskSource implements TaskSource {
  private filePath: string;
  private parseOptions: ParseOptions;

  constructor() {
    const prefs = getAppPreferences();
    // No directory configured: behave as an empty note. The task list shows
    // setup guidance instead of this source throwing during render.
    this.filePath = prefs.dailyNotePath
      ? getDailyNotePath(prefs.dailyNotePath, prefs.dailyNoteFormat)
      : "";
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

  async markDone(taskTitle: string): Promise<MarkResult> {
    // Titles are compared exactly as parsed, so "Agenda" never marks
    // "Prepare Agenda".
    return this.editTimetable((lines, range) => {
      for (let i = range[0]; i < range[1]; i++) {
        const line = lines[i];
        if (!DONE_TASK_RE.test(line) && taskLineTitle(line) === taskTitle) {
          lines[i] = line.replace(/^(- \d+p\s+)/, "$1[done] ");
          return true;
        }
      }
      return false;
    });
  }

  async markSubtaskDone(
    taskTitle: string,
    subtaskTitle: string,
  ): Promise<MarkResult> {
    return this.editTimetable((lines, range) => {
      let inTask = false;
      for (let i = range[0]; i < range[1]; i++) {
        const line = lines[i];
        const title = taskLineTitle(line);
        if (title !== null) {
          inTask = title === taskTitle;
          continue;
        }
        if (/^#{1,6} /.test(line)) {
          inTask = false;
          continue;
        }
        if (
          inTask &&
          !DONE_SUBTASK_RE.test(line) &&
          subtaskLineTitle(line) === subtaskTitle
        ) {
          lines[i] = line.replace(/^((?:\t| {2,})- )/, "$1[done] ");
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Read the note, let `edit` change lines inside the timetable section, and
   * write it back if anything changed. The whole read-modify-write runs
   * under the session lock so it cannot interleave with a session being
   * appended to the same note by another command.
   */
  private async editTimetable(
    edit: (lines: string[], range: [number, number]) => boolean,
  ): Promise<MarkResult> {
    const result = await withSessionLock(async () => {
      if (!fs.existsSync(this.filePath)) return;
      const lines = fs.readFileSync(this.filePath, "utf-8").split("\n");
      // Only edit inside the timetable section so lines elsewhere in the
      // note (e.g. other sections mentioning the same task) are never touched.
      const range = findTimetableRange(
        lines,
        this.parseOptions.timetableHeader,
      );
      if (!range) return;
      if (edit(lines, range)) {
        fs.writeFileSync(this.filePath, lines.join("\n"), "utf-8");
      }
    });
    return result.acquired ? "ok" : "busy";
  }
}
