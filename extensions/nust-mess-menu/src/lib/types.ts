export const MEAL_NAMES = ["breakfast", "lunch", "dinner"] as const;
export type MealName = (typeof MEAL_NAMES)[number];

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Each meal is a list of dish names.
export type DayMeals = Record<MealName, string[]>;

// Serving window as 24-hour "HH:MM" strings, Pakistan time.
export type MealTimings = Record<MealName, [start: string, end: string]>;

// Response of https://eat.deeznust.com/api/menu
export interface Menu {
  timezone: string;
  timings: { weekday: MealTimings; weekend: MealTimings };
  startDate: string;
  endDate: string;
  days: Record<Weekday, DayMeals>;
  nextMonday: DayMeals;
}
