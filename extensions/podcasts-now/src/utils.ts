import { parseInt, split, truncate } from "lodash";

export const trimTitle = (title?: string) => {
  return truncate(title, { length: 36, separator: " " });
};

export const formatDuration = (duration: string) => {
  const comps = split(duration, ":");
  if (comps.length === 1) {
    try {
      const date = new Date(0);
      date.setSeconds(parseInt(comps[0]));
      return date.toISOString().substring(11, 19);
    } catch (err) {
      return "";
    }
  }
  if (comps.length === 2 || comps.length === 3) {
    return duration;
  }
  return "";
};

export const formatProgress = (cur: number, total: number) => {
  if (!total || !cur) return "";
  return `${Math.round((cur / total) * 100)}%`;
};
