import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  convertTime,
  formatTime,
  getDisambiguationLabel,
  getInvalidFavorites,
  getTargetTimezones,
  parseQuery,
} from "./timezone-utils";
import type { ParsedQuery } from "./timezone-utils";

interface Preferences {
  favoriteTimezones: string;
}

export default function ConvertTime(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { favoriteTimezones } = getPreferenceValues<Preferences>();

  // Warn about invalid favorites on mount
  useEffect(() => {
    const invalid = getInvalidFavorites(favoriteTimezones);
    if (invalid.length > 0) {
      showToast({
        style: Toast.Style.Warning,
        title: "Skipping unknown timezone(s)",
        message: invalid.join(", "),
      });
    }
  }, []);

  const trimmed = searchText.trim();

  // --- Empty state ---
  if (!trimmed) {
    return (
      <SearchList searchText={searchText} onSearchTextChange={setSearchText}>
        <List.EmptyView
          title="Convert Time Across Timezones"
          description={"Try typing:\n• 7:22 CET\n• 3pm PST to EST\n• 14:00 Tokyo\n• 11 IST"}
          icon={Icon.Clock}
        />
      </SearchList>
    );
  }

  // --- Parse input ---
  const parsed = parseQuery(trimmed);

  if (parsed.error) {
    return (
      <SearchList searchText={searchText} onSearchTextChange={setSearchText}>
        <List.EmptyView
          title="Couldn't parse your input"
          description={`${parsed.error}\n\nFormat: TIME TIMEZONE [to TARGET]\nExamples: 7:22 CET, 3pm PST to EST`}
          icon={Icon.ExclamationMark}
        />
      </SearchList>
    );
  }

  // --- Compute conversions ---
  const targets = getTargetTimezones(parsed, favoriteTimezones);
  const results = targets.map((tz) =>
    convertTime(
      parsed.hours,
      parsed.minutes,
      parsed.sourceTimezone,
      tz.ianaId,
      tz.label || getDisambiguationLabel(tz.ianaId, parsed.sourceLabel),
    ),
  );
  const allConversionsStr = results.map((r) => `${r.formattedTime} ${r.abbreviation}`).join(" = ");

  return (
    <SearchList searchText={searchText} onSearchTextChange={setSearchText}>
      <List.Section title={`${parsed.timeStr} ${parsed.sourceLabel} →`}>
        {results.map((result) => (
          <List.Item
            key={result.ianaId + (result.label ?? "")}
            icon={{
              source: result.isLocal ? Icon.House : Icon.Globe,
              tintColor: result.isLocal ? Color.Blue : Color.SecondaryText,
            }}
            title={`${result.formattedTime} ${result.abbreviation}`}
            subtitle={result.label || formatIanaId(result.ianaId)}
            accessories={[
              ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
              ...(result.dayOffset !== 0
                ? [
                    {
                      tag: {
                        value: result.dayOffset > 0 ? "+1 day" : "-1 day",
                        color: Color.Orange,
                      },
                    },
                  ]
                : []),
              {
                text: {
                  value: `UTC${result.utcOffset}`,
                  color: Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Time" content={`${result.formattedTime} ${result.abbreviation}`} />
                <Action.CopyToClipboard
                  title="Copy Time Only"
                  content={result.formattedTime}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.Push
                  title="Reverse Conversion"
                  icon={Icon.Switch}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  target={
                    <ReverseConversionView
                      hours={result.hours}
                      minutes={result.minutes}
                      sourceIanaId={result.ianaId}
                      sourceLabel={result.abbreviation}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy All Conversions"
                  content={allConversionsStr}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </SearchList>
  );
}

function SearchList({
  searchText,
  onSearchTextChange,
  children,
}: {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  children: React.ReactNode;
}) {
  return (
    <List
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      searchText={searchText}
      searchBarPlaceholder="e.g. 7:22 CET or 3pm PST to EST"
      navigationTitle="Convert Time"
      throttle
    >
      {children}
    </List>
  );
}

function ReverseConversionView({
  hours,
  minutes,
  sourceIanaId,
  sourceLabel,
}: {
  hours: number;
  minutes: number;
  sourceIanaId: string;
  sourceLabel: string;
}) {
  const { favoriteTimezones } = getPreferenceValues<Preferences>();

  const reverseParsed: ParsedQuery = {
    timeStr: formatTime(hours, minutes),
    hours,
    minutes,
    sourceTimezone: sourceIanaId,
    sourceLabel,
  };

  const targets = getTargetTimezones(reverseParsed, favoriteTimezones);
  const results = targets.map((t) => convertTime(hours, minutes, sourceIanaId, t.ianaId, t.label));

  return (
    <List navigationTitle={`${sourceLabel} → Conversions`}>
      <List.Section title={`${formatTime(hours, minutes)} ${sourceLabel} →`}>
        {results.map((result) => (
          <List.Item
            key={result.ianaId + (result.label ?? "")}
            icon={{
              source: result.isLocal ? Icon.House : Icon.Globe,
              tintColor: result.isLocal ? Color.Blue : Color.SecondaryText,
            }}
            title={`${result.formattedTime} ${result.abbreviation}`}
            subtitle={result.label || formatIanaId(result.ianaId)}
            accessories={[
              ...(result.isLocal ? [{ tag: { value: "Local", color: Color.Green } }] : []),
              ...(result.dayOffset !== 0
                ? [
                    {
                      tag: {
                        value: result.dayOffset > 0 ? "+1 day" : "-1 day",
                        color: Color.Orange,
                      },
                    },
                  ]
                : []),
              {
                text: {
                  value: `UTC${result.utcOffset}`,
                  color: Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Time" content={`${result.formattedTime} ${result.abbreviation}`} />
                <Action.CopyToClipboard
                  title="Copy Time Only"
                  content={result.formattedTime}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function formatIanaId(ianaId: string): string {
  const parts = ianaId.split("/");
  parts.shift();
  return parts.map((p) => p.replace(/_/g, " ")).join(" / ");
}
