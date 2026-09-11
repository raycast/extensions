import { useState, useMemo } from "react";
import { List } from "@raycast/api";
import { DateRangeKey, DateRangeParams } from "./types";

interface DateRangePreset {
  key: DateRangeKey;
  title: string;
  getRange: () => DateRangeParams;
  getPreviousRange: () => DateRangeParams;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    key: "today",
    title: "Today",
    getRange: () => ({
      startAt: startOfDay(new Date()).toISOString(),
      endAt: new Date().toISOString(),
    }),
    getPreviousRange: () => {
      const yesterday = daysAgo(1);
      return {
        startAt: startOfDay(yesterday).toISOString(),
        endAt: endOfDay(yesterday).toISOString(),
      };
    },
  },
  {
    key: "yesterday",
    title: "Yesterday",
    getRange: () => {
      const yesterday = daysAgo(1);
      return {
        startAt: startOfDay(yesterday).toISOString(),
        endAt: endOfDay(yesterday).toISOString(),
      };
    },
    getPreviousRange: () => {
      const dayBefore = daysAgo(2);
      return {
        startAt: startOfDay(dayBefore).toISOString(),
        endAt: endOfDay(dayBefore).toISOString(),
      };
    },
  },
  {
    key: "7d",
    title: "Last 7 Days",
    getRange: () => ({
      startAt: startOfDay(daysAgo(7)).toISOString(),
      endAt: new Date().toISOString(),
    }),
    getPreviousRange: () => ({
      startAt: startOfDay(daysAgo(14)).toISOString(),
      endAt: startOfDay(daysAgo(7)).toISOString(),
    }),
  },
  {
    key: "30d",
    title: "Last 30 Days",
    getRange: () => ({
      startAt: startOfDay(daysAgo(30)).toISOString(),
      endAt: new Date().toISOString(),
    }),
    getPreviousRange: () => ({
      startAt: startOfDay(daysAgo(60)).toISOString(),
      endAt: startOfDay(daysAgo(30)).toISOString(),
    }),
  },
  {
    key: "90d",
    title: "Last 90 Days",
    getRange: () => ({
      startAt: startOfDay(daysAgo(90)).toISOString(),
      endAt: new Date().toISOString(),
    }),
    getPreviousRange: () => ({
      startAt: startOfDay(daysAgo(180)).toISOString(),
      endAt: startOfDay(daysAgo(90)).toISOString(),
    }),
  },
  {
    key: "month",
    title: "This Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startAt: start.toISOString(),
        endAt: now.toISOString(),
      };
    },
    getPreviousRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );
      return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
    },
  },
  {
    key: "last-month",
    title: "Last Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );
      return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
    },
    getPreviousRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        0,
        23,
        59,
        59,
        999,
      );
      return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
    },
  },
  {
    key: "year",
    title: "This Year",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startAt: start.toISOString(),
        endAt: now.toISOString(),
      };
    },
    getPreviousRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
    },
  },
];

export function getPreset(key: DateRangeKey): DateRangePreset {
  return DATE_RANGE_PRESETS.find((p) => p.key === key) ?? DATE_RANGE_PRESETS[0];
}

export function useDateRange(defaultKey: DateRangeKey = "30d") {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>(defaultKey);
  const preset = getPreset(rangeKey);
  const range = useMemo(() => preset.getRange(), [rangeKey]);
  const previousRange = useMemo(() => preset.getPreviousRange(), [rangeKey]);

  const dropdown = (
    <List.Dropdown
      tooltip="Date Range"
      storeValue
      value={rangeKey}
      onChange={(v) => setRangeKey(v as DateRangeKey)}
    >
      {DATE_RANGE_PRESETS.map((p) => (
        <List.Dropdown.Item key={p.key} title={p.title} value={p.key} />
      ))}
    </List.Dropdown>
  );

  return { rangeKey, range, previousRange, dropdown };
}
