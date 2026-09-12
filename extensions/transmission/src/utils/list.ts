import { padStart } from "./string";

/**
 * Given a list of strings, pads them all to the same length.
 */
export const padList = (list: string[]): string[] => {
  const maxLength = list.reduce((max, item) => Math.max(max, item.length), 0);
  return list.map((item) => padStart(item, maxLength));
};
