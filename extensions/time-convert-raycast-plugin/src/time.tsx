import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";
import { parseDateInput } from "./lib/parser";
import { formatInstantForZone, parseOutputZones, parseZone, zoneDisplayName } from "./lib/timezone";

interface Preferences {
  defaultInputZone?: string;
  outputZones?: string;
}

function UsageExamples() {
  const examples = [
    "now",
    "1548854618000",
    "2019-01-30 21:24:44,gmt-7",
    "2024-01-12T08:30:00+08:00",
    "2024/01/12 8:30 PM",
  ];

  return (
    <List.Section title="Examples">
      {examples.map((example) => (
        <List.Item
          key={example}
          icon={Icon.Text}
          title={example}
          subtitle="Parses in real time"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Example" content={example} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const defaultSourceZone = useMemo(
    () =>
      parseZone(preferences.defaultInputZone ?? "Local") ??
      ({
        kind: "fixed",
        offsetMinutes: 0,
        label: "UTC",
      } as const),
    [preferences.defaultInputZone],
  );

  const outputZones = useMemo(() => parseOutputZones(preferences.outputZones, true), [preferences.outputZones]);

  const parseResult = useMemo(() => parseDateInput(searchText, defaultSourceZone), [searchText, defaultSourceZone]);

  const hasInput = searchText.trim().length > 0;

  return (
    <List
      isShowingDetail={false}
      throttle
      searchBarPlaceholder="Enter time, e.g. now / 1548854618000 / 2019-01-30 21:24:44,gmt-7"
      onSearchTextChange={setSearchText}
    >
      {!hasInput && <UsageExamples />}

      {hasInput && !parseResult.ok && (
        <List.Section title="Parse Error">
          <List.Item
            icon={Icon.XMarkCircle}
            title="Unable to parse this format"
            subtitle={parseResult.error}
            accessories={[{ text: `source: ${parseResult.sourceZoneLabel}` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Error" content={parseResult.error} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {hasInput && parseResult.ok && (
        <>
          <List.Section title="Timestamp">
            <List.Item
              icon={Icon.Clock}
              title="TimeStamp"
              subtitle={`${parseResult.date.getTime()} ms`}
              accessories={[{ text: `source: ${parseResult.sourceZoneLabel}` }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Milliseconds" content={`${parseResult.date.getTime()}`} />
                  <Action.CopyToClipboard
                    title="Copy Seconds"
                    content={`${Math.trunc(parseResult.date.getTime() / 1000)}`}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Time Zones">
            {outputZones.map((zone) => {
              const value = formatInstantForZone(parseResult.date, zone);
              return (
                <List.Item
                  key={`${zoneDisplayName(zone)}:${value}`}
                  icon={Icon.Globe}
                  title={zoneDisplayName(zone)}
                  subtitle={value}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Formatted Time" content={value} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
