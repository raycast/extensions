import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { lookupCity } from "./citySearch";
import { generateCompactTimelineMarkdown } from "./timeline-renderer";
import { getSunTimes } from "./sun-times";
import { getCityName, getTimezone } from "./timezones";

function getNextHour(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.toISOString();
}

export interface TimelineViewProps {
  baseISO: string;
  baseCityId: string | null;
  selectedZoneIds: string[];
  onShiftMinutes: (delta: number) => void;
  onSetBaseISO: (iso: string) => void;
  onToggleView: () => void;
  onClearBase: () => Promise<void>;
}

export function TimelineView(props: TimelineViewProps) {
  const { baseISO, baseCityId, selectedZoneIds, onShiftMinutes, onSetBaseISO, onToggleView, onClearBase } = props;

  const baseZoneId = baseCityId ? getTimezone(baseCityId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseTime = useMemo(() => DateTime.fromISO(baseISO).setZone(baseZoneId), [baseISO, baseZoneId]);

  const markdown = useMemo(() => {
    return generateCompactTimelineMarkdown({
      baseISO,
      baseCityId,
      selectedZoneIds,
    });
  }, [baseISO, baseCityId, selectedZoneIds]);

  const citySunTimes = useMemo(() => {
    const date = new Date(baseISO);
    return selectedZoneIds.map((zoneId) => {
      const city = lookupCity(zoneId);
      const cityName = getCityName(zoneId);
      const timezone = getTimezone(zoneId);

      if (city && city.lat && city.lng) {
        const sunTimes = getSunTimes(city.lat, city.lng, date, timezone);
        return { cityName, sunrise: sunTimes.sunrise, sunset: sunTimes.sunset };
      }
      return { cityName, sunrise: "—", sunset: "—" };
    });
  }, [baseISO, selectedZoneIds]);

  return (
    <Detail
      navigationTitle="Timeline View"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Date" text={baseTime.toFormat("cccc, LLLL d, yyyy")} />
          <Detail.Metadata.TagList title="Legend">
            <Detail.Metadata.TagList.Item text="💼 9-5" color={Color.Green} />
            <Detail.Metadata.TagList.Item text="⚠️ 7-9, 5-12" color={Color.Yellow} />
            <Detail.Metadata.TagList.Item text="😴 12-7" color={Color.Red} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {/* <Detail.Metadata.Label title="Cities" text="Sunrise → Sunset" /> */}
          {citySunTimes.map((city) => (
            <Detail.Metadata.Label
              key={city.cityName}
              title={city.cityName}
              text={`↑☀️ ${city.sunrise} ↓☀️ ${city.sunset}`}
            />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="← →  |  ⌥← →  |  ⌘N" text="±1hr  ±30min  Reset" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Edit Timezones"
            icon={Icon.Pencil}
            onAction={onToggleView}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Reset to Now"
            icon={Icon.Clock}
            onAction={() => onSetBaseISO(getNextHour())}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ActionPanel.Section title="Scrub Time">
            <Action
              title="-1 Hour"
              icon={Icon.ArrowLeft}
              onAction={() => onShiftMinutes(-60)}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action
              title="+1 Hour"
              icon={Icon.ArrowRight}
              onAction={() => onShiftMinutes(60)}
              shortcut={{ modifiers: [], key: "arrowRight" }}
            />
            <Action
              title="-30 Minutes"
              icon={Icon.ArrowLeftCircle}
              onAction={() => onShiftMinutes(-30)}
              shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
            />
            <Action
              title="+30 Minutes"
              icon={Icon.ArrowRightCircle}
              onAction={() => onShiftMinutes(30)}
              shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
            />
          </ActionPanel.Section>
          {baseCityId && (
            <ActionPanel.Section title="Settings">
              <Action
                title="Use System Timezone"
                icon={Icon.ComputerChip}
                onAction={() => void onClearBase()}
                shortcut={{ modifiers: ["cmd"], key: "0" }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Base ISO"
              content={baseTime.toISO() ?? ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
