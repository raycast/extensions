import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { lookupCity } from "./citySearch";
import { generateCompactTimelineMarkdown } from "./timeline-renderer";
import { getSunTimes } from "./sun-times";
import { getCurrentTimeISO } from "./time-utils";
import { getCityName, getTimezone } from "./timezones";

export interface TimelineViewProps {
  baseISO: string;
  baseCityId: string | null;
  selectedZoneIds: string[];
  onShiftMinutes: (delta: number) => void;
  onSetBaseISO: (iso: string) => void;
  onToggleView: () => void;
  onClearBase: () => Promise<void>;
  scrubMinutes: number;
  optionScrubMinutes: number;
}

export function TimelineView(props: TimelineViewProps) {
  const {
    baseISO,
    baseCityId,
    selectedZoneIds,
    onShiftMinutes,
    onSetBaseISO,
    onToggleView,
    onClearBase,
    scrubMinutes,
    optionScrubMinutes,
  } = props;

  function formatScrubTitle(minutes: number): string {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    if (abs === 60) return `${sign}1 Hour`;
    return `${sign}${abs} Minutes`;
  }

  function formatScrubLabel(minutes: number): string {
    if (minutes === 60) return "1hr";
    return `${minutes}min`;
  }

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
        return { zoneId, cityName, sunrise: sunTimes.sunrise, sunset: sunTimes.sunset };
      }
      return { zoneId, cityName, sunrise: "—", sunset: "—" };
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
          {citySunTimes.map((city) => (
            <Detail.Metadata.Label
              key={city.zoneId}
              title={city.cityName}
              text={`↑☀️ ${city.sunrise} ↓☀️ ${city.sunset}`}
            />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="← →  |  ⌥← →  |  ⌘N"
            text={`±${formatScrubLabel(scrubMinutes)}  ±${formatScrubLabel(optionScrubMinutes)}  Reset`}
          />
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
            onAction={() => onSetBaseISO(getCurrentTimeISO())}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ActionPanel.Section title="Scrub Time">
            <Action
              title={formatScrubTitle(-scrubMinutes)}
              icon={Icon.ArrowLeft}
              onAction={() => onShiftMinutes(-scrubMinutes)}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action
              title={formatScrubTitle(scrubMinutes)}
              icon={Icon.ArrowRight}
              onAction={() => onShiftMinutes(scrubMinutes)}
              shortcut={{ modifiers: [], key: "arrowRight" }}
            />
            <Action
              title={formatScrubTitle(-optionScrubMinutes)}
              icon={Icon.ArrowLeftCircle}
              onAction={() => onShiftMinutes(-optionScrubMinutes)}
              shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
            />
            <Action
              title={formatScrubTitle(optionScrubMinutes)}
              icon={Icon.ArrowRightCircle}
              onAction={() => onShiftMinutes(optionScrubMinutes)}
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
