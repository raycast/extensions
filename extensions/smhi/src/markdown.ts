import {
  formatDay,
  formatHour,
  formatPrecip,
  formatPrecipAmount,
  formatTemp,
  formatWind,
  type DailySummary,
} from "./format";
import { symbolFor } from "./symbols";
import { levelPresentation, type ResolvedWarning } from "./warnings";

// Coming days keep an interval table instead of metadata rows, because five columns of hour-by-hour
// values is the one shape Detail.Metadata can't express.
export function dayMarkdown(summary: DailySummary): string {
  const symbol = symbolFor(summary.symbolCode);
  const lines: string[] = [];
  lines.push(`## ${symbol.emoji}  ${symbol.label}`);
  lines.push("");
  lines.push(
    `**${formatDay(summary.representativeTime)}** · ${formatTemp(summary.maxTemp)} / ${formatTemp(summary.minTemp)}`,
  );
  lines.push("");
  const dry = summary.precipMaxMm < 0.05 && summary.maxPrecipProb < 5;
  lines.push(
    dry
      ? "No precipitation expected"
      : `Precipitation ${formatPrecipAmount(summary.precipMinMm, summary.precipMaxMm)} mm · up to ${Math.round(summary.maxPrecipProb)} % chance`,
  );
  lines.push("");
  lines.push(`| Time |  | Temp | Wind m/s | Precip |`);
  lines.push(`|---|---|---|---|---|`);
  for (const entry of summary.entries) {
    const entrySymbol = symbolFor(entry.data.symbol_code);
    lines.push(
      `| ${formatHour(entry.time)} | ${entrySymbol.emoji} | ${formatTemp(entry.data.air_temperature)} | ${formatWind(entry.data.wind_speed, entry.data.wind_from_direction, entry.data.wind_speed_of_gust)} | ${formatPrecip(entry.data.precipitation_amount_mean, entry.data.probability_of_precipitation)} |`,
    );
  }
  return lines.join("\n");
}

// Warnings lead with SMHI's own prose; the level, area and validity window sit in the metadata
// below so the description isn't pushed off the top of the pane.
export function warningMarkdown(warning: ResolvedWarning): string {
  const pres = levelPresentation(warning.level);
  const lines: string[] = [];
  lines.push(`## ${pres.emoji}  ${pres.label} − ${warning.eventLabel}`);
  lines.push("");
  for (const description of warning.descriptions) {
    if (!description.text) continue;
    lines.push(`### ${description.title || "Details"}`);
    lines.push("");
    lines.push(description.text);
    lines.push("");
  }
  return lines.join("\n");
}
