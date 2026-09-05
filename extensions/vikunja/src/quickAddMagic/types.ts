export interface repeatParsedResult {
  textWithoutMatched: string;
  repeats: IRepeatAfter | null;
}

export interface ParsedTaskText {
  text: string;
  date: Date | null;
  labels: string[];
  project: string | null;
  priority: number | null;
  assignees: string[];
  repeats: IRepeatAfter | null;
}

export interface Prefixes {
  label: string;
  project: string;
  priority: string;
  assignee: string;
}

export interface IRepeatAfter {
  type: IRepeatType;
  amount: number;
}

export type IRepeatType =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years";

export const REPEAT_TYPES = {
  Seconds: "seconds" as const,
  Minutes: "minutes" as const,
  Hours: "hours" as const,
  Days: "days" as const,
  Weeks: "weeks" as const,
  Months: "months" as const,
  Years: "years" as const,
} as const;

export type IRepeatMode = 0 | 1 | 2;

export const TASK_REPEAT_MODES = {
  REPEAT_MODE_DEFAULT: 0 as IRepeatMode,
  REPEAT_MODE_MONTH: 1 as IRepeatMode,
  REPEAT_MODE_FROM_CURRENT_DATE: 2 as IRepeatMode,
} as const;
