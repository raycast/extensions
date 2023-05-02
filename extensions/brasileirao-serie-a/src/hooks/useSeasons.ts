import { eachYearOfInterval, getYear } from "date-fns";
import { useState } from "react";

const seasons = eachYearOfInterval({
  start: new Date(2020, 0, 1),
  end: new Date(),
}).map((date) => getYear(date).toString());

seasons.sort((a, b) => b.localeCompare(a));

const CURRENT_SEASON = seasons[0];

export function useSeasons() {
  const [currentSeason, setCurrentSeason] = useState(CURRENT_SEASON);
  return [currentSeason, seasons, setCurrentSeason] as const;
}
