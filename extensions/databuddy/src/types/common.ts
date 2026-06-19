export interface QueryFilter {
  field: string;
  op: "eq" | "ne" | "contains" | "starts_with" | "in" | "not_in";
  value: string | string[];
}

export type DatePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "last_90d";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "last_90d", label: "Last 90 Days" },
];
