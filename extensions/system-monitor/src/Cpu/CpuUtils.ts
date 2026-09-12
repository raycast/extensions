import { ProcessInfo } from "../Interfaces";
import { getTopProcesses } from "../lib/process-list";

const UNITS = {
  year: 24 * 60 * 60 * 365,
  month: (24 * 60 * 60 * 365) / 12,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 0,
};

export const getTopCpuProcess = async (count: number): Promise<ProcessInfo[]> => {
  return getTopProcesses("cpu", count);
};

export const getRelativeTime = (uptime: number): string => {
  const rtf = new Intl.RelativeTimeFormat("en");

  for (const unit in UNITS) {
    const seconds = UNITS[unit as keyof typeof UNITS];

    if (uptime > seconds || unit == "second") {
      return rtf.format(-Math.round(uptime / seconds), unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return "Unknown";
};
