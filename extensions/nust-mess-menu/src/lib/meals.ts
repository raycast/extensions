import {
  MEAL_NAMES,
  WEEKDAYS,
  type DayMeals,
  type Meal,
  type MealName,
  type TodayMenu,
  type WeekMenu,
  type Weekday,
} from "./types";

const TIME_ZONE = "Asia/Karachi";

export const MEAL_META: Record<MealName, { title: string; startMinute: number; endMinute: number }> = {
  breakfast: { title: "Breakfast", startMinute: 7 * 60, endMinute: 10 * 60 },
  lunch: { title: "Lunch", startMinute: 12 * 60, endMinute: 15 * 60 },
  dinner: { title: "Dinner", startMinute: 19 * 60, endMinute: 22 * 60 },
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function formatMealItems(meal: Meal | undefined): string {
  if (!meal?.items.length) {
    return "Not listed";
  }
  return meal.items.map((item) => item.name).join(", ");
}

export function mealHeadline(meal: Meal | undefined): string {
  return meal?.items[0]?.name ?? "Not listed";
}

export function formatWeekday(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function formatMenuDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00+05:00`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function karachiWeekday(): Weekday {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "long" })
    .format(new Date())
    .toLowerCase();
  return day as Weekday;
}

export function karachiMinuteOfDay(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

// After dinner ends at 22:00 there's no meal left today.
export type ActiveMeal = { name: MealName; status: "now" | "next" } | { status: "closed" };

export function getActiveMeal(): ActiveMeal {
  const minute = karachiMinuteOfDay();

  for (const name of MEAL_NAMES) {
    const { startMinute, endMinute } = MEAL_META[name];
    if (minute >= startMinute && minute < endMinute) {
      return { name, status: "now" };
    }
  }

  for (const name of MEAL_NAMES) {
    if (minute < MEAL_META[name].startMinute) {
      return { name, status: "next" };
    }
  }

  return { status: "closed" };
}

// The week API covers Monday to Sunday, so on Sunday there's no tomorrow in it.
export function tomorrowWeekday(): Weekday | undefined {
  return WEEKDAYS[WEEKDAYS.indexOf(karachiWeekday()) + 1];
}

function mealCell(meal: Meal | undefined): string {
  if (!meal?.items.length) {
    return "-";
  }
  return escapeCell(meal.items.map((item) => item.name).join(", "));
}

function mealHeader(name: MealName): string {
  const active = getActiveMeal();
  if (active.status === "closed" || active.name !== name) {
    return MEAL_META[name].title;
  }
  return `${MEAL_META[name].title} · ${active.status === "now" ? "Now" : "Next"}`;
}

export function todayTableMarkdown(menu: TodayMenu): string {
  const headers = MEAL_NAMES.map(mealHeader);
  const maxRows = Math.max(1, ...MEAL_NAMES.map((name) => menu.meals[name]?.items.length ?? 0));
  const rows: string[] = [];

  for (let index = 0; index < maxRows; index++) {
    const cells = MEAL_NAMES.map((name) => {
      const item = menu.meals[name]?.items[index]?.name;
      return item ? escapeCell(item) : "";
    });
    rows.push(`| ${cells.join(" | ")} |`);
  }

  return [
    `# ${formatMenuDate(menu.date)}`,
    "",
    `| ${headers.join(" | ")} |`,
    `| ${MEAL_NAMES.map(() => ":---:").join(" | ")} |`,
    ...rows,
  ].join("\n");
}

export function weekTableMarkdown(menu: WeekMenu): string {
  const today = karachiWeekday();
  const headers = ["Day", ...MEAL_NAMES.map((name) => MEAL_META[name].title)];
  const rows = WEEKDAYS.map((day) => {
    const label = day === today ? `**${formatWeekday(day)}**` : formatWeekday(day);
    const meals = menu.menu[day];
    const cells = [label, ...MEAL_NAMES.map((name) => mealCell(meals[name]))];
    return `| ${cells.join(" | ")} |`;
  });

  return [
    `# Week ${menu.weekNumber}`,
    "",
    `${formatMenuDate(menu.startDate)} to ${formatMenuDate(menu.endDate)}`,
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => ":---:").join(" | ")} |`,
    ...rows,
  ].join("\n");
}

export function copyDayMenu(meals: DayMeals): string {
  return MEAL_NAMES.map((name) => `${MEAL_META[name].title}: ${formatMealItems(meals[name])}`).join("\n");
}

export function rootSubtitle(meals: DayMeals, tomorrow: DayMeals | undefined): string {
  const active = getActiveMeal();
  if (active.status === "closed") {
    return tomorrow ? `Tomorrow's Breakfast, ${formatMealItems(tomorrow.breakfast)}` : "Dinner's over";
  }
  const items = formatMealItems(meals[active.name]);
  if (active.status === "now") {
    return `Now · ${items}`;
  }
  return `Next ${MEAL_META[active.name].title}, ${items}`;
}
