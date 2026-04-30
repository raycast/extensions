import {
  ActionPanel,
  Form,
  Action,
  showHUD,
  Clipboard,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { parseTimeInput } from "./utils/timeParser";
import { resolveTimezone } from "./utils/timezones";
import { TIMEZONE_ALIASES } from "./constants";
import { ConversionResult, ParseResult, Preferences } from "./types";

interface FormValues {
  time: string;
  locations: string;
  outputFormat: string;
}

const TIME_FORMAT = "h:mm a";
const DAY_FORMAT = "EEEE"; // "Friday", "Saturday", etc.
const DATE_TIME_FORMAT = "EEEE, MMM d, h:mm a";
const DATE_TIME_FORMAT_WITH_YEAR = "EEEE, MMM d, yyyy h:mm a";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultLocations = preferences.defaultLocations
    .split(",")
    .map((l) => l.trim());

  const [error, setError] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function handleSubmit(values: FormValues) {
    try {
      setError(undefined);
      setSuggestions([]);

      const locations = values.locations
        ? values.locations.split(",").map((l) => l.trim())
        : defaultLocations;
      const format =
        values.outputFormat?.toLowerCase() || preferences.defaultFormat;

      const parsed = parseTimeInput(values.time);
      const results: ConversionResult[] = [];
      const newSuggestions: string[] = [];

      for (const location of locations) {
        const resolution = resolveTimezone(location);

        if (resolution.success && resolution.timezone) {
          try {
            const tz = resolution.timezone;

            if (parsed.isRange) {
              const startTime = formatInTimeZone(parsed.date, tz, TIME_FORMAT);
              const endTime = formatInTimeZone(parsed.endDate, tz, TIME_FORMAT);
              const startDayName = formatInTimeZone(
                parsed.date,
                tz,
                DAY_FORMAT,
              );
              const endDayName = formatInTimeZone(
                parsed.endDate,
                tz,
                DAY_FORMAT,
              );

              results.push({
                success: true,
                location,
                time: startTime,
                endTime,
                startDayName,
                endDayName,
              });
            } else {
              const dateFormat = parsed.includesYear
                ? DATE_TIME_FORMAT_WITH_YEAR
                : DATE_TIME_FORMAT;
              const formattedTime = parsed.includesDate
                ? formatInTimeZone(parsed.date, tz, dateFormat)
                : formatInTimeZone(parsed.date, tz, TIME_FORMAT);

              results.push({ success: true, location, time: formattedTime });
            }
          } catch (e) {
            console.error("Conversion error:", e);
            results.push({
              success: false,
              location,
              time: "",
              error: "Error converting timezone",
            });
          }
        } else {
          const similarLocations = findSimilarLocations(location);
          newSuggestions.push(...similarLocations);
          results.push({
            success: false,
            location,
            time: "",
            error: resolution.error || "Unknown location",
            suggestions: similarLocations,
          });
        }
      }

      setSuggestions(newSuggestions);

      const showDayLabels = shouldShowDayLabels(parsed, results);

      const output =
        format === "list"
          ? formatListOutput(results, parsed, showDayLabels)
          : formatInlineOutput(results, parsed, showDayLabels);

      await Clipboard.copy(output);
      try {
        await Clipboard.paste(output);
        await showHUD("Times converted and pasted");
      } catch (e) {
        console.error("Paste error:", e);
        await showHUD("Times converted and copied to clipboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    }
  }

  function findSimilarLocations(query: string): string[] {
    const normalized = query.toLowerCase();
    const matches = new Set<string>();

    for (const key of TIMEZONE_ALIASES.keys()) {
      const keyLower = key.toLowerCase();
      if (keyLower.includes(normalized) || normalized.includes(keyLower)) {
        matches.add(key.charAt(0) + key.slice(1).toLowerCase());
      }
      if (matches.size >= 3) break;
    }

    return Array.from(matches).slice(0, 3);
  }

  function formatListOutput(
    results: ConversionResult[],
    parsed: ParseResult,
    showDayLabels: boolean,
  ): string {
    return results
      .map((r) => {
        if (r.success) {
          return `• ${formatResultTime(r, parsed, showDayLabels)}`;
        }
        const suggestionText = r.suggestions?.length
          ? ` (Did you mean: ${r.suggestions.join(", ")}?)`
          : "";
        return `⚠️ Unknown location: ${formatLocationName(r.location)}${suggestionText}`;
      })
      .join("\n");
  }

  function formatInlineOutput(
    results: ConversionResult[],
    parsed: ParseResult,
    showDayLabels: boolean,
  ): string {
    const successfulResults = results
      .filter((r) => r.success)
      .map((r) => formatResultTime(r, parsed, showDayLabels));

    const errorResults = results
      .filter((r) => !r.success)
      .map((r) => `⚠️ Unknown: ${formatLocationName(r.location)}`);

    return [...successfulResults, ...errorResults].join(" / ");
  }

  /**
   * Formats a single result entry into its final output string.
   *
   * Single time with date:    "Fri, Mar 14, 2025 3:00 PM Austin"
   * Single time without date: "3:00 PM Austin"
   * Range, same day:          "1:00 PM - 3:00 PM Austin"
   * Range, same day + labels: "1:00 PM - 3:00 PM (Friday) Austin"
   * Range, spans midnight:    "11:00 PM (Friday) - 12:00 AM (Saturday) Austin"
   */
  function formatResultTime(
    r: ConversionResult,
    parsed: ParseResult,
    showDayLabels: boolean,
  ): string {
    const loc = formatLocationName(r.location);

    if (!parsed.isRange) {
      return `${r.time} ${loc}`;
    }

    const { time, endTime, startDayName, endDayName } = r;

    if (!endTime || !startDayName || !endDayName) {
      return `${time} ${loc}`;
    }

    if (!showDayLabels) {
      return `${time} - ${endTime} ${loc}`;
    }

    if (startDayName !== endDayName) {
      return `${time} (${startDayName}) - ${endTime} (${endDayName}) ${loc}`;
    }

    return `${time} - ${endTime} (${endDayName}) ${loc}`;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert Time"
            icon={Icon.Clock}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="time"
        title="Time"
        placeholder="3PM, 1pm - 3pm, next Thursday 2PM, now"
        error={error}
        onChange={() => setError(undefined)}
        info={[
          "Enter a time or time range.",
          "Keywords: now, noon, midnight",
          "Ranges: 1pm - 3pm, 1pm to 3pm, 11pm through 1am",
          "Natural language: tomorrow 3pm, next Friday 2pm, in 3 hours, Christmas 5pm",
        ].join("\n")}
      />
      <Form.TextField
        id="locations"
        title="Locations"
        placeholder={preferences.defaultLocations}
        info={
          suggestions.length > 0
            ? `Suggestions: ${suggestions.join(", ")}`
            : `Default locations: ${preferences.defaultLocations}`
        }
      />
      <Form.Dropdown
        id="outputFormat"
        title="Format"
        info="Inline: times separated by /   List: one time per line"
        defaultValue={preferences.defaultFormat}
      >
        <Form.Dropdown.Item
          value="inline"
          title="Inline"
          icon={Icon.ArrowRight}
        />
        <Form.Dropdown.Item value="list" title="List" icon={Icon.List} />
      </Form.Dropdown>
    </Form>
  );
}

/**
 * Formats a location name for display.
 *
 * - Short all-caps strings (≤4 chars, no spaces) are treated as abbreviations
 *   and kept as-is: "NYC", "EST", "LAX" → unchanged.
 * - Everything else is title-cased: "austin" → "Austin",
 *   "new york" → "New York", "LONDON" → "London".
 */
function formatLocationName(location: string): string {
  const trimmed = location.trim();
  if (
    trimmed.length <= 4 &&
    trimmed === trimmed.toUpperCase() &&
    !/\s/.test(trimmed)
  ) {
    return trimmed;
  }
  return trimmed.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Determines whether day labels should be shown for a range output.
 *
 * Rules:
 * - If the input included an explicit date → always show labels
 * - Otherwise → show labels only if any timezone's range spans midnight
 *   (i.e. startDayName !== endDayName for at least one result)
 */
function shouldShowDayLabels(
  parsed: ParseResult,
  results: ConversionResult[],
): boolean {
  if (!parsed.isRange) return false;
  if (parsed.includesDate) return true;

  return results.some(
    (r) =>
      r.success &&
      r.startDayName !== undefined &&
      r.startDayName !== r.endDayName,
  );
}
