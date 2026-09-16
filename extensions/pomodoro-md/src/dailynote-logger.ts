import * as fs from "fs";
import { getDailyNotePath } from "./parser";
import { getAppPreferences } from "./preferences";
import { formatTime, PomodoroLog } from "./timer";
import { LogWriter } from "./log-writer";
import { appendLogEntry } from "./log-markdown";

export class DailyNoteLogWriter implements LogWriter {
  async writeLog(log: PomodoroLog): Promise<void> {
    const prefs = getAppPreferences();
    const filePath = getDailyNotePath(
      prefs.dailyNotePath,
      prefs.dailyNoteFormat,
    );
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, "utf-8");
    const updated = appendLogEntry(content, log.taskTitle, formatEntry(log), {
      pomodoroLogHeader: prefs.pomodoroLogHeader,
      logSectionHeader: prefs.logSectionHeader,
    });
    fs.writeFileSync(filePath, updated, "utf-8");
  }
}

// "\t- [x] 09:02-09:27 Subtask" — [ ] when stopped early, subtask optional.
export function formatEntry(log: PomodoroLog): string {
  const mark = log.completed ? "x" : " ";
  const subtask = log.subtaskTitle ? ` ${log.subtaskTitle}` : "";
  return `\t- [${mark}] ${formatTime(log.startedAt)}-${formatTime(log.endedAt)}${subtask}`;
}
