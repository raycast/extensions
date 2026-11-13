import { clampScore } from "./format-forecast";

type ForecastIconLevel = 0 | 25 | 50 | 75 | 100;

export function forecastIconLevel(score: number): ForecastIconLevel {
  return (Math.round(clampScore(score) / 25) * 25) as ForecastIconLevel;
}

export function forecastIconAsset(score: number): string {
  return `forecast-agent-${forecastIconLevel(score)}.svg`;
}
