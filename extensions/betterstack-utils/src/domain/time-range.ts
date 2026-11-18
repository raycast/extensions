export const TimeRange = {
  WEEK: "week",
  MONTH: "month",
} as const;

export type TimeRange = (typeof TimeRange)[keyof typeof TimeRange];
