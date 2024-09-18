import { sportNames } from "./constants";

export function getSportName(sportId: number): string {
  return sportNames[sportId] ?? "Workout";
}
