import { Tool } from "@raycast/api";
import { checkinHabit } from "../api/habits";
import { batchConfirmation } from "./lib/confirm";
import { loadHabits, resolveHabitRefs } from "./lib/data";

type HabitRef = {
  /** Habit ID from list-habits */
  habitId?: string;
  /** Habit name if ID unknown */
  habitName?: string;
};

type Input = {
  /** Habits to check in. Confirmation is required when checking in more than one. */
  habits: HabitRef[];
  /** Optional check-in date in ISO 8601 (defaults to today) */
  date?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const habits = input.habits ?? [];
  return batchConfirmation(
    habits.length,
    `Check in ${habits.length} habits?`,
    habits.slice(0, 8).map((h) => ({ name: "Habit", value: h.habitName ?? h.habitId ?? "?" })),
  );
};

/**
 * Check in one or more TickTick habits for today (or a given date). Call list-habits first when IDs are unknown.
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

  const resolved = resolveHabitRefs(refs, allHabits);

  for (const habit of resolved) {
    await checkinHabit(habit.habitId, date);
  }

  return { checkedIn: resolved, count: resolved.length };
}
