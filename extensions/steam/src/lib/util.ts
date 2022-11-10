import { formatDuration, addMinutes, intervalToDuration } from "date-fns";
import { GameDataSimple } from "../types";

export const humanTime = (time: number) => {
  const now = new Date();
  const end = addMinutes(now, time);
  const duration = intervalToDuration({ start: now, end });
  return formatDuration(duration);
};

// .reverse() is causing content flash
export const reverse = (array: GameDataSimple[]) => {
  const output = [];
  for (let i = array.length - 1; i >= 0; i--) {
    output.push(array[i]);
  }
  return output;
};
