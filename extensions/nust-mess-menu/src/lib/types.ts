export const MEAL_NAMES = ["breakfast", "lunch", "dinner"] as const;
export type MealName = (typeof MEAL_NAMES)[number];

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface MenuItem {
  name: string;
  averageRating: number | null;
  ratingCount: number;
  userRating: number | null;
}

export interface Meal {
  items: MenuItem[];
  aggregateRating: number | null;
  totalRatings: number;
  userHasRated: boolean;
}

export type DayMeals = Record<MealName, Meal>;

export interface TodayMenu {
  date: string;
  day: Weekday;
  weekNumber: number;
  meals: DayMeals;
}

export interface WeekMenu {
  weekNumber: number;
  startDate: string;
  endDate: string;
  menu: Record<Weekday, DayMeals>;
}
