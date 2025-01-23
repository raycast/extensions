import { getPreferenceValues } from "@raycast/api";
import { moviedb } from "./api";

export function getRating(rating?: number) {
  const STAR = "⭐";
  return rating ? `${rating.toFixed(2)} ${STAR.repeat(Math.round(rating / 2))}` : "Not Rated";
}

export function formatMovieDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hoursString = `${hours}`;
  const minutesString = remainingMinutes < 10 ? `0${remainingMinutes}` : `${remainingMinutes}`;

  if (remainingMinutes === 0) {
    return `${hoursString}h`;
  } else {
    return `${hoursString}h${minutesString}`;
  }
}

export function formatTVEpisodeDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hoursString = `${hours}`;
  const minutesString = remainingMinutes < 10 ? `0${remainingMinutes}` : `${remainingMinutes}`;

  if (hours === 0) {
    return `${minutesString}m`;
  } else {
    return `${hoursString}h ${minutesString}m`;
  }
}

const { currShow } = getPreferenceValues();

export async function getSeasonStartEnd() {
  const seasons = await moviedb.tvInfo({ id: currShow }).then((response) => response.seasons || []);

  const seasonStart = seasons?.[0].season_number || 0;
  const seasonEnd = seasons?.[seasons.length - 1].season_number || 0;

  return { seasonStart, seasonEnd };
}
