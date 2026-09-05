import { getItemsFromPrefix } from "./prefixParser";

const PRIORITIES = {
  UNSET: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
  DO_NOW: 5,
} as const;

export const getPriority = (text: string, prefix: string): number | null => {
  const ps = getItemsFromPrefix(text, prefix);
  if (ps.length === 0) {
    return null;
  }

  for (const p of ps) {
    for (const pi of Object.values(PRIORITIES)) {
      if (pi === parseInt(p)) {
        return parseInt(p);
      }
    }
  }

  return null;
};
