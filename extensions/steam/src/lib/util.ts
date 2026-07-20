import { formatDuration, addMinutes, intervalToDuration } from "date-fns";
import { GameDataSimple, GameSimple } from "../types";

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

export const tryJsonGameFromAi = (input: string): GameSimple[] | undefined => {
  try {
    const response = JSON.parse(input);
    // make sure it's an array, and has { name: string }
    if (!Array.isArray(response)) return undefined;
    const games = response.filter((game) => game?.name);
    // If empty, then return undefined
    return games.length ? games : undefined;
  } catch {
    return undefined;
  }
};

export const randomFromArray = <T>(array: T[] | undefined) => {
  if (!array) return undefined;
  return array[Math.floor(Math.random() * array.length)] as T;
};
