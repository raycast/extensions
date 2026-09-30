export type SnoozeOption = { title: string; value: string; minutes?: number; days?: number; startOfDay?: boolean };

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { title: "15 min", value: "FROM_NOW_15M", minutes: 15 },
  { title: "30 min", value: "FROM_NOW_30M", minutes: 30 },
  { title: "1 hr", value: "FROM_NOW_1H", minutes: 60 },
  { title: "2 hrs", value: "FROM_NOW_2H", minutes: 120 },
  { title: "4 hrs", value: "FROM_NOW_4H", minutes: 240 },
  { title: "1 day", value: "TOMORROW", days: 1, startOfDay: true },
  { title: "2 days", value: "IN_TWO_DAYS", days: 2, startOfDay: true },
  { title: "1 week", value: "NEXT_WEEK", days: 7, startOfDay: true },
];
