import { Action, Tool } from "@raycast/api";
import { uncheckinHabit } from "../api/habits";
import { findHabitByName, loadHabits } from "./lib/data";

type HabitRef = {
  /** Habit ID from list-habits */
  habitId?: string;
  /** Habit name if ID unknown */
  habitName?: string;
};

type Input = {
  /** Habits to undo check-in for */
  habits: HabitRef[];
  /** Optional date in ISO 8601 (defaults to today) */
  date?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const habits = input.habits ?? [];
  return {
    style: Action.Style.Destructive,
    message: `Undo check-in for ${habits.length} habit${habits.length === 1 ? "" : "s"}?`,
    info: habits.slice(0, 8).map((h) => ({ name: "Habit", value: h.habitName ?? h.habitId ?? "?" })),
  };
};

/**
 * Undo habit check-ins. Always asks for confirmation.
 */
export default async function tool(input: Input) {
  const refs = input.habits ?? [];
  if (refs.length === 0) {
    throw new Error("Provide at least one habit in `habits`.");
  }

  const allHabits = await loadHabits();
  const date = input.date ? new Date(input.date) : undefined;
  if (date && Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${input.date}". Use ISO 8601.`);
  }

  const resolved = [];
  for (const ref of refs) {
    let habitId = ref.habitId;
    let habitName = ref.habitName;
    if (!habitId && habitName) {
      const match = findHabitByName(allHabits, habitName);
      if (!match) throw new Error(`Habit "${habitName}" not found.`);
      habitId = match.id;
      habitName = match.name;
    }
    if (!habitId) throw new Error("Each habit requires habitId or habitName.");
    if (!habitName) {
      habitName = allHabits.find((h) => h.id === habitId)?.name ?? habitId;
    }
    await uncheckinHabit(habitId, date);
    resolved.push({ habitId, habitName });
  }

  return { unchecked: resolved, count: resolved.length };
}
