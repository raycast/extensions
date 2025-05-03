// File: src/convert.tsx
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
import { ALL_TIMEZONE_ALIASES } from "./constants";

interface Preferences {
  defaultLocations: string;
  defaultFormat: "inline" | "list";
}

interface FormValues {
  time: string;
  locations: string;
  outputFormat: string;
}

interface ConversionResult {
  success: boolean;
  location: string;
  time: string;
  error?: string;
  suggestions?: string[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultLocations = preferences.defaultLocations
    .split(",")
    .map((l) => l.trim());

  const [error, setError] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastResults, setLastResults] = useState<ConversionResult[]>([]);

  async function handleSubmit(values: FormValues) {
    try {
      setError(undefined);
      setSuggestions([]);

      const locations = values.locations
        ? values.locations.split(",").map((l) => l.trim())
        : defaultLocations;
      const format =
        values.outputFormat?.toLowerCase() || preferences.defaultFormat;

      const { date: targetTime, includesDate } = parseTimeInput(values.time);
      const results: ConversionResult[] = [];
      const newSuggestions: string[] = [];

      for (const location of locations) {
        const resolution = resolveTimezone(location);

        if (resolution.success && resolution.timezone) {
          try {
            const formattedTime = includesDate
              ? formatInTimeZone(
                  targetTime,
                  resolution.timezone,
                  "EEE, MMM d, yyyy h:mm a",
                )
              : formatInTimeZone(targetTime, resolution.timezone, "h:mm a");

            results.push({
              success: true,
              location,
              time: formattedTime,
            });
          } catch (e) {
            console.error("An error occurred:", e);
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

      setLastResults(results);
      setSuggestions(newSuggestions);

      const output =
        format === "list"
          ? formatListOutput(results)
          : formatInlineOutput(results);

      await Clipboard.copy(output);
      try {
        await Clipboard.paste(output);
        await showHUD("Times converted and pasted");
      } catch (e) {
        console.error("An error occurred:", e);
        await showHUD("Times converted and copied to clipboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    }
  }

  function findSimilarLocations(query: string): string[] {
    const normalized = query.toLowerCase();
    const matches = new Set<string>();

    // Check aliases
    ALL_TIMEZONE_ALIASES.forEach((timezone, alias) => {
      if (
        alias.toLowerCase().includes(normalized) ||
        normalized.includes(alias.toLowerCase())
      ) {
        matches.add(alias);
      }
    });

    // Add from previous successful conversions
    lastResults
      .filter(
        (r) =>
          r.success &&
          (r.location.toLowerCase().includes(normalized) ||
            normalized.includes(r.location.toLowerCase())),
      )
      .forEach((r) => matches.add(r.location));

    return Array.from(matches).slice(0, 3);
  }

  function formatListOutput(results: ConversionResult[]): string {
    return results
      .map((r) => {
        if (r.success) {
          return `• ${r.time} ${r.location}`;
        } else {
          const suggestionText = r.suggestions?.length
            ? ` (Did you mean: ${r.suggestions.join(", ")}?)`
            : "";
          return `⚠️ Unknown location: ${r.location}${suggestionText}`;
        }
      })
      .join("\n");
  }

  function formatInlineOutput(results: ConversionResult[]): string {
    const successfulResults = results
      .filter((r) => r.success)
      .map((r) => `${r.time} ${r.location}`);

    const errorResults = results
      .filter((r) => !r.success)
      .map((r) => `⚠️ Unknown: ${r.location}`);

    return [...successfulResults, ...errorResults].join(" / ");
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
        placeholder="3PM, next Thursday 2PM, noon on Christmas"
        error={error}
        onChange={() => setError(undefined)}
        info="Enter time with optional date (e.g., 'next Friday 3pm')"
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
        info="Choose the format of the output, newline for list, inline for comma separated"
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
