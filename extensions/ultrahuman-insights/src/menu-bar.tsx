import {
  MenuBarExtra,
  Icon,
  Color,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo } from "react";
import { clearRange } from "./lib/cache";
import { formatDuration, fmt, todayDateKey, latestWithField, relativeDateLabel } from "./lib/format";
import { insightFor, statusColor } from "./lib/insights";
import { sortByDate } from "./lib/daily-metrics";
import { useDailyRange } from "./lib/use-daily-range";

export default function MenuBar() {
  const { data, stale, loading, missingToken, error, refresh, range } = useDailyRange(2);

  const sortedRange = useMemo(() => (data ? sortByDate(data) : []), [data]);
  const sleepEntry = useMemo(() => latestWithField(sortedRange, "sleep_score"), [sortedRange]);

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
      <MenuBarExtra icon={{ source: Icon.Cog, tintColor: Color.SecondaryText }} title="Ultrahuman">
        <MenuBarExtra.Item title="Set API Token" onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  // Recovery/movement metrics always come from the last entry (today's).
  const latestEntry = sortedRange[sortedRange.length - 1] ?? null;

  // When the sleep entry isn't today's, show a subtle date hint in the section.
  const sleepDate = sleepEntry?.date;
  const sleepDateLabel = relativeDateLabel(sleepDate);
  const sleepIsYesterday = sleepDate != null && sleepDate !== todayDateKey() && sleepDateLabel != null;

  const title = hasError ? "⚠️" : score != null ? String(score) : "—";

  return (
    <MenuBarExtra icon={moonIcon} title={title} isLoading={loading}>
      {hasError && <MenuBarExtra.Item title="Refresh failed" subtitle={error.message.slice(0, 80)} />}
      {stale && <MenuBarExtra.Item title="⚠️ Showing cached data" />}
      <MenuBarExtra.Section title="Sleep">
        {sleepIsYesterday && <MenuBarExtra.Item title="Last night's sleep" subtitle={sleepDateLabel ?? ""} />}
        <MenuBarExtra.Item title="Total" subtitle={formatDuration(sleepEntry?.total_sleep)} />
        <MenuBarExtra.Item title="REM" subtitle={formatDuration(sleepEntry?.rem_sleep)} />
        <MenuBarExtra.Item title="Deep" subtitle={formatDuration(sleepEntry?.deep_sleep)} />
        <MenuBarExtra.Item title="Light" subtitle={formatDuration(sleepEntry?.light_sleep)} />
        <MenuBarExtra.Item title="Efficiency" subtitle={fmt(sleepEntry?.sleep_efficiency, "%")} />
        <MenuBarExtra.Item title="Restorative" subtitle={fmt(sleepEntry?.restorative_sleep, "%")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Recovery">
        <MenuBarExtra.Item title="HRV" subtitle={fmt(latestEntry?.hrv, "ms")} />
        <MenuBarExtra.Item title="Night RHR" subtitle={fmt(latestEntry?.night_rhr, "bpm")} />
        <MenuBarExtra.Item title="Recovery Index" subtitle={fmt(latestEntry?.recovery_index)} />
        <MenuBarExtra.Item title="Movement Index" subtitle={fmt(latestEntry?.movement_index)} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today's Health"
          onAction={async () => {
            try {
              await launchCommand({ name: "today", type: LaunchType.UserInitiated });
            } catch (e) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not open Today's Health",
                message: e instanceof Error ? e.message : String(e),
              });
            }
          }}
        />
        <MenuBarExtra.Item
          title="Refresh Now"
          onAction={async () => {
            clearRange(range.start, range.end);
            await refresh();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
