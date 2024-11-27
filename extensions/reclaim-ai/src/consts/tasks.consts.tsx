type SnoozeOption = { title: string; value: string };

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { title: "15 min", value: "FROM_NOW_15M" },
  { title: "30 min", value: "FROM_NOW_30M" },
  { title: "1 hr", value: "FROM_NOW_1H" },
  { title: "2 hrs", value: "FROM_NOW_2H" },
  { title: "4 hrs", value: "FROM_NOW_4H" },
  { title: "1 day", value: "TOMORROW" },
  { title: "2 days", value: "IN_TWO_DAYS" },
  { title: "1 week", value: "NEXT_WEEK" },
];
