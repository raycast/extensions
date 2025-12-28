import { LocalStorage } from "@raycast/api";
import { Habit, DayLog } from "../types/habit";

const KEY_HABITS = "habits";
const KEY_LOGS_PREFIX = "logs_";

export class StorageService {
  // Habits
  static async getHabits(): Promise<Habit[]> {
    const json = await LocalStorage.getItem<string>(KEY_HABITS);
    if (!json) return [];
    try {
      return JSON.parse(json) as Habit[];
    } catch (e) {
      console.error("Failed to parse habits", e);
      return [];
    }
  }

  static async saveHabits(habits: Habit[]): Promise<void> {
    await LocalStorage.setItem(KEY_HABITS, JSON.stringify(habits));
  }

  static async addHabit(habit: Habit): Promise<void> {
    const habits = await this.getHabits();
    habits.push(habit);
    await this.saveHabits(habits);
  }

  static async updateHabit(updatedHabit: Habit): Promise<void> {
    const habits = await this.getHabits();
    const index = habits.findIndex((h) => h.id === updatedHabit.id);
    if (index !== -1) {
      habits[index] = updatedHabit;
      await this.saveHabits(habits);
    }
  }

  static async deleteHabit(habitId: string): Promise<void> {
    const habits = await this.getHabits();
    const filtered = habits.filter((h) => h.id !== habitId);
    await this.saveHabits(filtered);
    // Cleanup logs
    await LocalStorage.removeItem(`${KEY_LOGS_PREFIX}${habitId}`);
  }

  // Logs
  // Storing logs per habit to avoid a massive single JSON blob
  private static getLogKey(habitId: string): string {
    return `${KEY_LOGS_PREFIX}${habitId}`;
  }

  static async getLogs(habitId: string): Promise<Record<string, DayLog>> {
    const json = await LocalStorage.getItem<string>(this.getLogKey(habitId));
    if (!json) return {};
    try {
      return JSON.parse(json) as Record<string, DayLog>; // Keyed by YYYY-MM-DD
    } catch (e) {
      console.error(`Failed to parse logs for ${habitId}`, e);
      return {};
    }
  }

  static async saveLogs(
    habitId: string,
    logs: Record<string, DayLog>
  ): Promise<void> {
    await LocalStorage.setItem(this.getLogKey(habitId), JSON.stringify(logs));
  }

  static async logDay(habitId: string, log: DayLog): Promise<void> {
    const logs = await this.getLogs(habitId);
    logs[log.date] = log;
    await this.saveLogs(habitId, logs);
  }

  static async removeLog(habitId: string, date: string): Promise<void> {
    const logs = await this.getLogs(habitId);
    if (logs[date]) {
      delete logs[date];
      await this.saveLogs(habitId, logs);
    }
  }
}
