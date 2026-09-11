import { format } from "date-fns";
import { getHabitCheckins } from "../api/habits";
import { loadHabits } from "./lib/data";

/**
 * List TickTick habits and whether each is checked in today.
 */
export default async function tool() {
  const habits = await loadHabits();
  const active = habits.filter((h) => h.status !== 1);
  const today = format(new Date(), "yyyyMMdd");
  const checkins =
    active.length > 0
      ? await getHabitCheckins(
          active.map((h) => h.id),
          1,
        )
      : [];
  const checkedToday = new Set(
    checkins.filter((c) => c.stampDate === today && (c.status === 2 || (c.value ?? 0) > 0)).map((c) => c.habitId),
  );

  return {
    habits: active.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      goal: h.goal,
      checkedInToday: checkedToday.has(h.id),
      totalCheckIns: h.totalCheckIns,
    })),
    count: active.length,
  };
}
