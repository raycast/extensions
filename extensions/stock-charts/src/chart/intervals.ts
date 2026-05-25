import type { Interval } from "../types";
export type { Interval } from "../types";
export { INTERVALS } from "../types";

export interface IntervalConfig {
  label: string;
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
    formatLabel: (ts) => formatHHmm(new Date(ts * 1000)),
  },
  "1W": {
    label: "1 Week",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${WEEKDAYS[d.getDay()]} ${formatHHmm(d)}`;
    },
  },
  "1M": {
    label: "1 Month",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  "3M": {
    label: "3 Months",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  "6M": {
    label: "6 Months",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  YTD: {
    label: "Year to Date",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    },
  },
  "1Y": {
    label: "1 Year",
    formatLabel: (ts) => MONTHS[new Date(ts * 1000).getMonth()],
  },
  "2Y": {
    label: "2 Years",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`;
    },
  },
  "5Y": {
    label: "5 Years",
    formatLabel: (ts) => {
      const d = new Date(ts * 1000);
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },
  },
};
