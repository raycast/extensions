import { Action, ActionPanel, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { lookupCity } from "./citySearch";
import { generateTimelineMarkdown } from "./timeline-renderer";
import { getSunTimes, SunTimes } from "./sun-times";
import { getTimezone } from "./timezones";

export interface TimelineViewProps {
  baseISO: string;
  nowISO: string;
  baseCityId: string | null;
  selectedZoneIds: string[];
  isLoading: boolean;
  onShiftMinutes: (delta: number) => void;
  onSnapMinutes: (stepMinutes: number, direction: 1 | -1) => void;
  onResetToNow: () => void;
  onToggleView: () => void;
  onClearBase: () => Promise<void>;
  scrubMinutes: number;
  optionScrubMinutes: number;
  timeFormat: string;
}

function formatSnapTitle(minutes: number, direction: 1 | -1): string {
  const which = direction > 0 ? "Next" : "Previous";
  if (minutes === 60) return `Snap to ${which} Hour`;
  return `Snap to ${which} ${minutes} Minutes`;
}

// Shared by the timeline and list views
export function SnapTimeSection(props: {
  scrubMinutes: number;
  optionScrubMinutes: number;
  onSnapMinutes: (stepMinutes: number, direction: 1 | -1) => void;
}) {
  const { scrubMinutes, optionScrubMinutes, onSnapMinutes } = props;
  return (
    <ActionPanel.Section title="Snap Time">
      <Action
        title={formatSnapTitle(scrubMinutes, -1)}
        icon={Icon.ChevronLeft}
        onAction={() => onSnapMinutes(scrubMinutes, -1)}
        shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
      />
      <Action
        title={formatSnapTitle(scrubMinutes, 1)}
        icon={Icon.ChevronRight}
        onAction={() => onSnapMinutes(scrubMinutes, 1)}
        shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
      />
      <Action
        title={formatSnapTitle(optionScrubMinutes, -1)}
        icon={Icon.ChevronLeftSmall}
        onAction={() => onSnapMinutes(optionScrubMinutes, -1)}
        shortcut={{ modifiers: ["shift", "opt"], key: "arrowLeft" }}
      />
      <Action
        title={formatSnapTitle(optionScrubMinutes, 1)}
        icon={Icon.ChevronRightSmall}
        onAction={() => onSnapMinutes(optionScrubMinutes, 1)}
        shortcut={{ modifiers: ["shift", "opt"], key: "arrowRight" }}
      />
    </ActionPanel.Section>
  );
}

export function TimelineView(props: TimelineViewProps) {
  const {
    baseISO,
    nowISO,
    baseCityId,
    selectedZoneIds,
    isLoading,
    onShiftMinutes,
    onSnapMinutes,
    onResetToNow,
    onToggleView,
    onClearBase,
    scrubMinutes,
    optionScrubMinutes,
    timeFormat,
  } = props;

  function formatScrubTitle(minutes: number): string {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    if (abs === 60) return `${sign}1 Hour`;
    return `${sign}${abs} Minutes`;
  }

  const baseZoneId = baseCityId ? getTimezone(baseCityId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseTime = useMemo(() => DateTime.fromISO(baseISO).setZone(baseZoneId), [baseISO, baseZoneId]);
  const appearance = environment.appearance;

  // Sunrise/sunset only depend on the date, so they are keyed on the base date and the set of cities
  // rather than recomputed on every cursor move.
  const sunDate = baseTime.toISODate() ?? "";
  const sunZoneKey = (baseCityId ? [baseCityId, ...selectedZoneIds] : selectedZoneIds).join("\n");
  const sunTimes = useMemo(() => {
    const date = DateTime.fromISO(sunDate, { zone: baseZoneId }).set({ hour: 12 }).toJSDate();
    const result: Record<string, SunTimes> = {};
    for (const zoneId of sunZoneKey.split("\n").filter(Boolean)) {
      const city = lookupCity(zoneId);
      result[zoneId] =
        city && city.lat && city.lng
          ? getSunTimes(city.lat, city.lng, date, getTimezone(zoneId), timeFormat)
          : { sunrise: "—", sunset: "—" };
    }
    return result;
  }, [sunDate, baseZoneId, sunZoneKey, timeFormat]);

  const markdown = useMemo(() => {
    return generateTimelineMarkdown({
      baseISO,
      baseCityId,
      selectedZoneIds,
      timeFormat,
      appearance,
      nowISO,
      sunTimes,
    });
  }, [baseISO, baseCityId, selectedZoneIds, timeFormat, appearance, nowISO, sunTimes]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "" : markdown}
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
            onAction={onResetToNow}
            shortcut={Keyboard.Shortcut.Common.Refresh}
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
          <SnapTimeSection
            scrubMinutes={scrubMinutes}
            optionScrubMinutes={optionScrubMinutes}
            onSnapMinutes={onSnapMinutes}
          />
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
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
