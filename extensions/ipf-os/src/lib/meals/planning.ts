import type {
  CompatibilityRule,
  DayChoice,
  MealDraft,
  MealSelection,
  MealTarget,
  MenuOption,
  SelectionWindow,
} from "./schemas";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAYS = [1, 2, 3, 4, 5];
export const MEALS_TIME_ZONE = "Africa/Dar_es_Salaam";

export function eatToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEALS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, offset: number): string {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function currentMonday(now = new Date()): string {
  const today = eatToday(now);
  const day = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  return addDays(today, 1 - day);
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: MEALS_TIME_ZONE, day: "numeric", month: "short" }).format(
    new Date(`${date.slice(0, 10)}T12:00:00Z`),
  );
}

export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 4);
  const startYear = weekStart.slice(0, 4);
  const endYear = end.slice(0, 4);
  return `${dateLabel(weekStart)}${startYear !== endYear ? ` ${startYear}` : ""}–${dateLabel(end)} ${endYear}`;
}

export function eatTime(instant: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: MEALS_TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(instant)) + " EAT"
  );
}

export function windowLabel(window: SelectionWindow): string {
  if (window.overrideActive && window.override)
    return `Special window until ${eatTime(window.override.closes_at)} · ${window.override.reason}`;
  if (!window.userAvailable) return "You are not available next week";
  if (window.phase === "GRACE") return `Grace period · closes ${eatTime(window.graceClosesAt)}`;
  if (window.phase === "OPEN")
    return `Submit by ${eatTime(window.closesAt)} · grace until ${eatTime(window.graceClosesAt)}`;
  return `Selection opens ${eatTime(window.nextWindowOpen)}`;
}

export function fingerprint(selection: MealSelection | null): string {
  return JSON.stringify(
    selection ? { id: selection.id, submittedAt: selection.submitted_at, days: selection.items } : null,
  );
}

export function createDraft(target: MealTarget, selection: MealSelection | null, now = new Date()): MealDraft {
  return {
    planId: target.id,
    weekStart: target.week_start.slice(0, 10),
    baseline: fingerprint(selection),
    updatedAt: now.toISOString(),
    warnings: [],
    days: DAYS.map((day): DayChoice => {
      const item = selection?.items.find((item) => item.day === day);
      return item?.main_id
        ? { day, state: "selected", mainId: item.main_id, sideId: item.side_id }
        : { day, state: selection ? "skipped" : "unselected", mainId: null, sideId: null };
    }),
  };
}

export function compatibleSides(
  day: number,
  mainId: string,
  options: MenuOption[],
  rules: CompatibilityRule[],
): MenuOption[] {
  const main = options.find((option) => option.day === day && option.role === "main" && option.id === mainId);
  if (!main || main.special) return [];
  const mainRules = rules.filter((rule) => rule.main_meal_id === mainId);
  const hasAllowList = mainRules.some((rule) => rule.allowed);
  return options.filter(
    (option) =>
      option.day === day &&
      option.role === "side" &&
      !mainRules.some((rule) => rule.side_meal_id === option.id && !rule.allowed) &&
      (!hasAllowList || mainRules.some((rule) => rule.side_meal_id === option.id && rule.allowed)),
  );
}

export function choiceIssue(choice: DayChoice, options: MenuOption[], rules: CompatibilityRule[]): string | undefined {
  const hasMenu = options.some((option) => option.day === choice.day && option.role === "main");
  if (choice.state === "unselected") return hasMenu ? "Choose a meal or explicitly skip this day" : undefined;
  if (choice.state === "skipped") return undefined;
  const main = options.find(
    (option) => option.day === choice.day && option.id === choice.mainId && option.role === "main",
  );
  if (!main) return "The selected main is no longer on this day's menu";
  if (choice.sideId && main.special) return "Complete dishes cannot have a side";
  if (
    choice.sideId &&
    !compatibleSides(choice.day, choice.mainId, options, rules).some((side) => side.id === choice.sideId)
  )
    return "Choose an available, compatible side";
  return undefined;
}

export function draftIssues(draft: MealDraft, options: MenuOption[], rules: CompatibilityRule[]) {
  return draft.days.flatMap((day) => {
    const message = choiceIssue(day, options, rules);
    return message ? [{ day: day.day, message }] : [];
  });
}

export function choiceLabel(choice: DayChoice, options: MenuOption[]): string {
  if (choice.state === "skipped") return "No meal · skipped";
  if (choice.state === "unselected")
    return options.some((option) => option.day === choice.day && option.role === "main")
      ? "Choose a meal"
      : "No menu available";
  const main =
    options.find((option) => option.day === choice.day && option.id === choice.mainId)?.name ??
    "Meal no longer available";
  const side = options.find((option) => option.day === choice.day && option.id === choice.sideId)?.name;
  return side ? `${main} · ${side}` : main;
}

export function reviewMarkdown(draft: MealDraft, options: MenuOption[], saved: MealSelection | null): string {
  const days = draft.days.map((choice) => {
    const previous = saved?.items.find((item) => item.day === choice.day);
    const changed =
      (saved && (previous?.main_id ?? null) !== choice.mainId) ||
      (saved && (previous?.side_id ?? null) !== choice.sideId);
    return `- **${WEEKDAYS[choice.day - 1]} ${dateLabel(addDays(draft.weekStart, choice.day - 1))}** — ${choiceLabel(choice, options)}${changed ? " · Changed" : ""}`;
  });
  return [
    `# Meals for ${weekLabel(draft.weekStart)}`,
    ...days,
    "",
    "This draft is not submitted until the server confirms your plan.",
  ].join("\n\n");
}

export function choicesMatch(draft: MealDraft, selection: MealSelection | null): boolean {
  return (
    selection !== null &&
    selection.weekly_plan_id === draft.planId &&
    draft.days.every((choice) => {
      const item = selection.items.find((item) => item.day === choice.day);
      return (item?.main_id ?? null) === choice.mainId && (item?.side_id ?? null) === choice.sideId;
    })
  );
}

export function absenceIsLate(date: string, now = new Date()): boolean {
  return now.getTime() >= Date.parse(`${date}T08:00:00+03:00`);
}

export function validAbsenceDate(date: string, now = new Date()): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date &&
    date >= eatToday(now)
  );
}
