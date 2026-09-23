import { DailyLogRepository } from "../DailyLogRepository";

export interface LogReminderPreferences {
  reminderEnabled?: boolean;
  workingHoursOnly?: boolean;
  startHour?: string;
  endHour?: string;
  thresholdMinutes?: string;
}

export interface CheckLogReminderResult {
  shouldRemind: boolean;
  message?: string;
}

export class CheckLogReminderUseCase {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  execute(prefs: LogReminderPreferences = {}, now: Date = new Date()): CheckLogReminderResult {
    const isEnabled = prefs.reminderEnabled ?? true;
    if (!isEnabled) {
      return { shouldRemind: false };
    }

    const workingHoursOnly = prefs.workingHoursOnly ?? true;
    if (workingHoursOnly) {
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (day === 0 || day === 6) {
        return { shouldRemind: false };
      }

      const startHour = parseInt(prefs.startHour || "9", 10);
      const endHour = parseInt(prefs.endHour || "18", 10);
      const currentHour = now.getHours();

      if (isNaN(startHour) || isNaN(endHour) || currentHour < startHour || currentHour >= endHour) {
        return { shouldRemind: false };
      }
    }

    const thresholdMinutes = parseInt(prefs.thresholdMinutes || "60", 10);
    const thresholdMs = (isNaN(thresholdMinutes) ? 60 : thresholdMinutes) * 60 * 1000;

    const logs = this.dailyLogRepository.getAllForDate(now);
    if (!logs || logs.length === 0) {
      return {
        shouldRemind: true,
        message: "Don't forget to log your daily activity in My Daily Log!",
      };
    }

    const sortedLogs = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime());
    const latestLog = sortedLogs[0];
    const diffMs = now.getTime() - latestLog.date.getTime();

    if (diffMs >= thresholdMs) {
      return {
        shouldRemind: true,
        message: "Don't forget to log your daily activity in My Daily Log!",
      };
    }

    return { shouldRemind: false };
  }
}
