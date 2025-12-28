import { StorageService } from "../api/storage";
import { Habit, DayLog, HabitStats, Frequency } from "../types/habit";
import { calculateStreak, calculateLongestStreak } from "../utils/streaks";
import { getToday_YYYYMMDD, parseDate_YYYYMMDD } from "../utils/date";
import { v4 as uuidv4 } from "uuid";
import { subDays, isAfter, isEqual } from "date-fns";

export class HabitService {
  static async getHabitsWithStats(): Promise<
    (Habit & { stats: HabitStats; todayLog?: DayLog })[]
  > {
    const habits = await StorageService.getHabits();
    const today = getToday_YYYYMMDD();
    const results = await Promise.all(
      habits.map(async (habit) => {
        const logs = await StorageService.getLogs(habit.id);
        const currentStreak = calculateStreak(logs, habit.frequency);
        const longestStreak = calculateLongestStreak(logs, habit.frequency);
        const todayLog = logs[today];

        // Calculate total completions (last 30 days?)
        const logValues = Object.values(logs);
        const totalCompletions = logValues.filter(
          (l) => l.status === "completed"
        ).length;

        // Completion rate 30d
        const thirtyDaysAgo = subDays(new Date(), 30);
        const last30Logs = logValues.filter((l) => {
          const date = parseDate_YYYYMMDD(l.date);
          return (
            (isAfter(date, thirtyDaysAgo) || isEqual(date, thirtyDaysAgo)) &&
            l.status === "completed"
          );
        });
        const completion_rate_30d = Math.round((last30Logs.length / 30) * 100);

        return {
          ...habit,
          stats: {
            current: currentStreak,
            longest: longestStreak,
            last_completed_date: null, // TODO: find max date
            total_completions: totalCompletions,
            completion_rate_30d: completion_rate_30d,
          },
          todayLog,
        };
      })
    );

    return results;
  }

  static async createHabit(
    name: string,
    frequency: string | number[] = "daily"
  ): Promise<Habit> {
    const newHabit: Habit = {
      id: uuidv4(),
      name,
      frequency: frequency as Frequency,
      created_at: new Date().toISOString(),
      is_paused: false,
      archived: false,
    };
    await StorageService.addHabit(newHabit);
    return newHabit;
  }

  static async logHabit(
    habitId: string,
    status: "completed" | "skipped",
    date: string = getToday_YYYYMMDD()
  ) {
    const log: DayLog = {
      habit_id: habitId,
      date,
      status,
      timestamp: Date.now(),
    };
    await StorageService.logDay(habitId, log);
  }

  static async undoLog(habitId: string, date: string = getToday_YYYYMMDD()) {
    await StorageService.removeLog(habitId, date);
  }

  static async togglePause(habitId: string) {
    const habits = await StorageService.getHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      habit.is_paused = !habit.is_paused;
      await StorageService.updateHabit(habit);
    }
  }

  static async updateHabitName(habitId: string, name: string) {
    const habits = await StorageService.getHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      habit.name = name;
      await StorageService.updateHabit(habit);
    }
  }

  static async updateHabit(habitId: string, updates: Partial<Habit>) {
    const habits = await StorageService.getHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      Object.assign(habit, updates);
      await StorageService.updateHabit(habit);
    }
  }

  static async deleteHabit(habitId: string) {
    await StorageService.deleteHabit(habitId);
  }
}
