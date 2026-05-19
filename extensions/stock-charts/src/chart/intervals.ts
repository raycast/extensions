import type { Interval } from "../types";
export type { Interval } from "../types";
export { INTERVALS } from "../types";

export interface IntervalConfig {
  label: string;
  range: string;
  interval: string;
  formatLabel: (timestamp: number) => string;
}

const pad = (n: number) => n.toString().padStart(2, "0");

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatHHmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const INTERVAL_CONFIG: Record<Interval, IntervalConfig> = {
  "1D": {
    label: "1 Day",
    range: "1d",
    interval: "5m",
    formatLabel: (ts) => formatHHmm(new Date(ts * 1000)),
  },
  "1W": {
    label: "1 Week",
    range: "5d",
    interval: "15m",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${WEEKDAYS[d.getDay()]} ${formatHHmm(d)}`;
    },
  },
  "1M": {
    label: "1 Month",
    range: "1mo",
    interval: "1d",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  "3M": {
    label: "3 Months",
    range: "3mo",
    interval: "1d",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  "6M": {
    label: "6 Months",
    range: "6mo",
    interval: "1wk",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  "1Y": {
    label: "1 Year",
    range: "1y",
    interval: "1wk",
    formatLabel: (ts) => MONTHS[new Date(ts * 1000).getMonth()],
  },
  "5Y": {
    label: "5 Years",
    range: "5y",
    interval: "1mo",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },
  },
};
