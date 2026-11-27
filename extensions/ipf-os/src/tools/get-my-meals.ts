import { z } from "zod";
import { getAbsences, getMealsHistory } from "../lib/api/meals";
import { getAuthProvider } from "../lib/auth";
import { mealsAccountKey } from "../lib/meals/drafts";
import { eatToday } from "../lib/meals/planning";
import { loadMealsOverview } from "../lib/meals/service";

interface Input {
  /** Explicit service date supplied by the user in YYYY-MM-DD. For today, omit this field: the tool resolves the current date in Africa/Dar_es_Salaam. Never guess today’s date. */
  date?: string;
}

export default async function getMyMeals(input: Input) {
  const date = z.iso.date().parse(input.date ?? eatToday());
  const session = await getAuthProvider().getSession();
  const overview = await loadMealsOverview(mealsAccountKey(session.subject));
  const [absences, history] = await Promise.all([getAbsences(date, date), getMealsHistory()]);
  const selections = [
    overview.dashboard.myCurrentSelection,
    overview.dashboard.myNextSelection,
    ...history.filter((selection) => !selection.cancelled),
  ];
  const selection = selections.find((entry) => {
    if (!entry) return false;
    const offset =
      (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${entry.week_start.slice(0, 10)}T12:00:00Z`)) / 86400000;
    return offset >= 0 && offset < 5;
  });
  const day = selection
    ? Math.round(
        (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${selection.week_start.slice(0, 10)}T12:00:00Z`)) / 86400000,
      ) + 1
    : null;
  const choice = selection?.items.find((item) => item.day === day);
  return {
    date,
    timezone: "Africa/Dar_es_Salaam",
    status: choice?.main_id ? "selected" : selection ? "skipped" : "no-saved-selection",
    meal: choice ? { main: choice.main_name, side: choice.side_name } : null,
    absence: absences[0] ?? null,
    targetWeek: overview.dashboard.nextWeekPlan,
    targetSelection: overview.dashboard.myNextSelection,
    expectedSavedAt: overview.dashboard.myNextSelection?.submitted_at ?? "",
    selectionWindow: overview.dashboard.windowStatus,
    note: "These are saved meal selections, not proof of collection or consumption.",
  };
}
