import {
  MenuBarExtra,
  Icon,
  Color,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import {
  formatDuration,
  fmt,
  lastNDaysEpoch,
  todayDateKey,
  latestWithField,
  relativeDateLabel,
} from "./lib/format";
import { DailyMetricsRange } from "./lib/types";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, statusColor } from "./lib/insights";

export default function MenuBar() {
  const dateKey = todayDateKey();
  // Fetch last 2 days so we can fall back to yesterday's sleep when today
  // hasn't synced yet (e.g. queried at 1am before Ring upload).
  const range = useMemo(() => lastNDaysEpoch(2), [dateKey]);
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);

  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  // Sort the range and pick the most recent entry that has sleep data.
  // These hooks must be above every early return (Rules of Hooks).
  const sortedRange = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        : [],
    [data],
  );
  const sleepEntry = useMemo(
    () => latestWithField(sortedRange, "sleep_score"),
    [sortedRange],
  );

  const score = sleepEntry?.sleep_score;
  const hasError = error != null;

  // Native Moon icon tinted by status
  const moonIcon = useMemo(() => {
    if (hasError) {
      return { source: Icon.Moon, tintColor: Color.Red };
    }
    const status = insightFor("sleep_score", score).status;
    return { source: Icon.Moon, tintColor: statusColor(status) };
  }, [score, hasError]);

  if (missingToken) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.Cog, tintColor: Color.SecondaryText }}
        title="Ultrahuman"
      >
        <MenuBarExtra.Item
          title="Set API Token"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  // Recovery/movement metrics always come from the last entry (today's).
  const latestEntry = sortedRange[sortedRange.length - 1] ?? null;

  // When the sleep entry isn't today's, show a subtle date hint in the section.
  const sleepDate = sleepEntry?.date;
  const sleepDateLabel = relativeDateLabel(sleepDate);
  const sleepIsYesterday =
    sleepDate != null && sleepDate !== todayDateKey() && sleepDateLabel != null;

  const title = hasError ? "⚠️" : score != null ? String(score) : "—";

  return (
    <MenuBarExtra icon={moonIcon} title={title} isLoading={loading}>
      {hasError && (
        <MenuBarExtra.Item
          title="Refresh failed"
          subtitle={error.message.slice(0, 80)}
        />
      )}
      {stale && <MenuBarExtra.Item title="⚠️ Showing cached data" />}
      <MenuBarExtra.Section title="Sleep">
        {sleepIsYesterday && (
          <MenuBarExtra.Item
            title="Last night's sleep"
            subtitle={sleepDateLabel ?? ""}
          />
        )}
        <MenuBarExtra.Item
          title="Total"
          subtitle={formatDuration(sleepEntry?.total_sleep)}
        />
        <MenuBarExtra.Item
          title="REM"
          subtitle={formatDuration(sleepEntry?.rem_sleep)}
        />
        <MenuBarExtra.Item
          title="Deep"
          subtitle={formatDuration(sleepEntry?.deep_sleep)}
        />
        <MenuBarExtra.Item
          title="Light"
          subtitle={formatDuration(sleepEntry?.light_sleep)}
        />
        <MenuBarExtra.Item
          title="Efficiency"
          subtitle={fmt(sleepEntry?.sleep_efficiency, "%")}
        />
        <MenuBarExtra.Item
          title="Restorative"
          subtitle={fmt(sleepEntry?.restorative_sleep, "%")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Recovery">
        <MenuBarExtra.Item title="HRV" subtitle={fmt(latestEntry?.hrv, "ms")} />
        <MenuBarExtra.Item
          title="Night RHR"
          subtitle={fmt(latestEntry?.night_rhr, "bpm")}
        />
        <MenuBarExtra.Item
          title="Recovery Index"
          subtitle={fmt(latestEntry?.recovery_index)}
        />
        <MenuBarExtra.Item
          title="Movement Index"
          subtitle={fmt(latestEntry?.movement_index)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today's Health"
          onAction={() =>
            launchCommand({ name: "today", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Refresh Now"
          onAction={async () => {
            clearRange(range.start, range.end);
            await reload();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
