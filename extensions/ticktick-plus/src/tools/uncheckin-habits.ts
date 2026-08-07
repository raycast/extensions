import { Tool } from "@raycast/api";
import { uncheckinHabit } from "../api/habits";
import { runBatch } from "./lib/batch";
import { destructiveConfirmation } from "./lib/confirm";
import { loadHabits, resolveHabitRefs } from "./lib/data";

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
  // Let the tool raise the validation error for an empty batch rather than spending a
  // habits fetch to confirm nothing.
  if (habits.length === 0) return undefined;
  const resolved = resolveHabitRefs(habits, await loadHabits(), "");
  return destructiveConfirmation(
    `Undo check-in for ${resolved.length} habit${resolved.length === 1 ? "" : "s"}?`,
    resolved.slice(0, 8).map((h) => ({ name: "Habit", value: h.habitName })),
  );
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

  const resolved = resolveHabitRefs(refs, allHabits, "");

  const unchecked = await runBatch(resolved, async (habit) => {
    await uncheckinHabit(habit.habitId, date);
    return habit;
  });

  return { unchecked, count: unchecked.length };
}
