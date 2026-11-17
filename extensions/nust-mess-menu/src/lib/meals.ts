import { SITE_URL } from "./urls";
import { MEAL_NAMES, WEEKDAYS, type DayMeals, type MealName, type MealTimings, type Menu, type Weekday } from "./types";

const TIME_ZONE = "Asia/Karachi";

export const MEAL_TITLES: Record<MealName, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const ATTRIBUTION = `Menu from [Eat Deez Nust](${SITE_URL})`;

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(time: string): string {
  const minutes = toMinutes(time);
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatMealItems(items: string[] | undefined): string {
  return items?.length ? items.join(", ") : "Not listed";
}

export function mealHeadline(items: string[] | undefined): string {
  return items?.[0] ?? "Not listed";
}

export function formatWeekday(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function formatMenuDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${isoDate}T00:00:00+05:00`));
}

function karachiNow(): { weekday: Weekday; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: part("weekday").toLowerCase() as Weekday,
    minute: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function todayWeekday(): Weekday {
  return karachiNow().weekday;
}

export function timingsFor(menu: Menu, day: Weekday): MealTimings {
  return day === "saturday" || day === "sunday" ? menu.timings.weekend : menu.timings.weekday;
}

// After dinner ends there's no meal left today.
export type ActiveMeal = { name: MealName; status: "now" | "next" } | { status: "closed" };

export function getActiveMeal(menu: Menu): ActiveMeal {
  const { weekday, minute } = karachiNow();
  const timings = timingsFor(menu, weekday);

  for (const name of MEAL_NAMES) {
    const [start, end] = timings[name];
    if (minute >= toMinutes(start) && minute < toMinutes(end)) {
      return { name, status: "now" };
    }
  }
  for (const name of MEAL_NAMES) {
    if (minute < toMinutes(timings[name][0])) {
      return { name, status: "next" };
    }
  }
  return { status: "closed" };
}

export function todayMeals(menu: Menu): DayMeals {
  return menu.days[todayWeekday()];
}

// The API covers Monday to Sunday and adds next Monday, so Sunday night still has a tomorrow.
export function tomorrowMeals(menu: Menu): DayMeals {
  const next = WEEKDAYS[WEEKDAYS.indexOf(todayWeekday()) + 1];
  return next ? menu.days[next] : menu.nextMonday;
}

export function todayDate(menu: Menu): string {
  const start = new Date(`${menu.startDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + WEEKDAYS.indexOf(todayWeekday()));
  return start.toISOString().slice(0, 10);
}

function mealHeader(menu: Menu, name: MealName): string {
  const active = getActiveMeal(menu);
  if (active.status === "closed" || active.name !== name) {
    return MEAL_TITLES[name];
  }
  return `${MEAL_TITLES[name]} · ${active.status === "now" ? "Now" : "Next"}`;
}

function servingTimes(menu: Menu, name: MealName): string {
  const [start, end] = timingsFor(menu, todayWeekday())[name];
  return `_${formatTime(start)} to ${formatTime(end)}_`;
}

export function todayTableMarkdown(menu: Menu): string {
  const meals = todayMeals(menu);
  const rows: string[] = [];
  const maxRows = Math.max(1, ...MEAL_NAMES.map((name) => meals[name]?.length ?? 0));

  for (let index = 0; index < maxRows; index++) {
    const cells = MEAL_NAMES.map((name) => escapeCell(meals[name]?.[index] ?? ""));
    rows.push(`| ${cells.join(" | ")} |`);
  }

  const lines = [
    `# ${formatMenuDate(todayDate(menu))}`,
    "",
    `| ${MEAL_NAMES.map((name) => mealHeader(menu, name)).join(" | ")} |`,
    `| ${MEAL_NAMES.map(() => ":---:").join(" | ")} |`,
    `| ${MEAL_NAMES.map((name) => servingTimes(menu, name)).join(" | ")} |`,
    ...rows,
  ];

  if (getActiveMeal(menu).status === "closed") {
    lines.push("", `**Tomorrow's Breakfast:** ${formatMealItems(tomorrowMeals(menu).breakfast)}`);
  }
  lines.push("", ATTRIBUTION);
  return lines.join("\n");
}

export function weekTableMarkdown(menu: Menu): string {
  const today = todayWeekday();
  const headers = ["Day", ...MEAL_NAMES.map((name) => MEAL_TITLES[name])];
  const rows = WEEKDAYS.map((day) => {
    const label = day === today ? `**${formatWeekday(day)}**` : formatWeekday(day);
    const cells = MEAL_NAMES.map((name) => {
      const items = menu.days[day]?.[name];
      return items?.length ? escapeCell(items.join(", ")) : "-";
    });
    return `| ${[label, ...cells].join(" | ")} |`;
  });

  return [
    "# This Week",
    "",
    `${formatMenuDate(menu.startDate)} to ${formatMenuDate(menu.endDate)}`,
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => ":---:").join(" | ")} |`,
    ...rows,
    "",
    ATTRIBUTION,
  ].join("\n");
}

export function copyDayMenu(meals: DayMeals): string {
  return MEAL_NAMES.map((name) => `${MEAL_TITLES[name]}: ${formatMealItems(meals[name])}`).join("\n");
}

export function rootSubtitle(menu: Menu): string {
  const active = getActiveMeal(menu);
  if (active.status === "closed") {
    return `Tomorrow's Breakfast, ${formatMealItems(tomorrowMeals(menu).breakfast)}`;
  }
  const items = formatMealItems(todayMeals(menu)[active.name]);
  return active.status === "now" ? `Now · ${items}` : `Next ${MEAL_TITLES[active.name]}, ${items}`;
}
