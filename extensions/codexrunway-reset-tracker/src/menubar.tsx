import {
  Color,
  Icon,
  Image,
  Keyboard,
  MenuBarExtra,
  open,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import {
  getProgressIcon,
  showFailureToast,
  useCachedPromise,
} from "@raycast/utils";
import { fetchMenuRecords } from "./notifications";
import { confidenceColor, statusIcon } from "./status";
import {
  formatDate,
  formatConfidence,
  recordsUrl,
  relativeTime,
  resetTodayIn,
  statusLabel,
  matchesPlan,
  nextScheduleIn,
  scheduleProgress,
  scheduleTime,
  humanize,
  brief,
} from "./api";

/** One request serves both the latest record and the reset-today scan (API allows 20/hour). */
const PAGE_SIZE = 10;

// Raycast dims items without an action; keep informational rows enabled.
const noop = () => {};

/** "Sep 09, 2026, 10:00 GMT+8 · 2h ago" — absolute time carries the detail, relative the feel. */
function stamp(iso: string): string {
  return `${formatDate(iso)} · ${relativeTime(iso)}`;
}

/** A timestamp row whose tooltip carries the raw UTC value the API actually returned. */
function TimeItem({
  icon,
  title,
  iso,
}: {
  icon: Icon;
  title: string;
  iso: string;
}) {
  return (
    <MenuBarExtra.Item
      icon={icon}
      title={title}
      subtitle={stamp(iso)}
      tooltip={iso}
      onAction={noop}
    />
  );
}

export default function Command() {
  const { plan, iconOnly, notifyResets } =
    getPreferenceValues<Preferences.Menubar>();
  const { data, error, isLoading, revalidate } = useCachedPromise(
    fetchMenuRecords,
    [recordsUrl("all", 1, PAGE_SIZE), plan, notifyResets],
    {
      keepPreviousData: true,
    },
  );

  const warning = error?.message ?? data?.warning;
  const records = (data?.data?.items ?? []).filter((record) =>
    matchesPlan(record, plan),
  );
  const next = nextScheduleIn(records);
  const confidence = formatConfidence(next?.confidence);
  const schedule = next ? scheduleTime(next) : null;
  const { resetToday, at, record: todayRecord } = resetTodayIn(records);
  const record = todayRecord ?? records[0];
  const recordIcon = record ? statusIcon(record) : null;

  const headline = warning
    ? "Update failed"
    : record
      ? resetToday
        ? "Reset today"
        : next
          ? "Reset scheduled"
          : "No reset confirmed"
      : "CodexRunway";

  /** The menu bar is scarce real estate: a countdown, not a sentence. */
  const countdown = schedule ? relativeTime(schedule.start) : null;
  /** "2h from now" -> "2h"; null once the start is behind us (`schedule.overdue` says so). */
  const soon = countdown?.endsWith(" from now")
    ? countdown.slice(0, -" from now".length)
    : null;
  const progress = next ? scheduleProgress(next) : null;

  /** A ring filling up as the wait elapses says more than a static clock glyph. */
  const menuIcon: Image.ImageLike = warning
    ? { source: Icon.ExclamationMark, tintColor: Color.Yellow }
    : resetToday
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : progress !== null
        ? getProgressIcon(progress, Color.PrimaryText)
        : {
            source: next ? Icon.Clock : Icon.Circle,
            tintColor: Color.SecondaryText,
          };
  const title = warning
    ? "Update failed"
    : resetToday
      ? "Reset today"
      : soon
        ? `Reset in ${soon}`
        : next
          ? "Reset due"
          : record
            ? "No reset"
            : "CodexRunway";

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={iconOnly ? undefined : title}
      isLoading={isLoading}
      tooltip={`${headline} · ${humanize(plan)} · Latest 10 records; local times`}
    >
      {warning && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
            title={warning}
            subtitle="showing cached data"
            onAction={noop}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Next Planned Reset">
        {next ? (
          <MenuBarExtra.Item
            icon={
              progress !== null
                ? getProgressIcon(progress, Color.Yellow)
                : { source: Icon.Clock, tintColor: Color.Yellow }
            }
            title={statusLabel(next)}
            subtitle={
              soon
                ? `Expected in ${soon}`
                : schedule?.overdue
                  ? "awaiting confirmation"
                  : "timing not yet confirmed"
            }
            tooltip={brief(next.text)}
            onAction={noop}
          />
        ) : (
          <MenuBarExtra.Item
            icon={Icon.CircleDisabled}
            title="No upcoming schedule"
            subtitle="in the latest records"
            onAction={noop}
          />
        )}
        {confidence && (
          <MenuBarExtra.Item
            icon={{
              source: Icon.Gauge,
              tintColor: confidenceColor(next?.confidence),
            }}
            title="Confidence"
            subtitle={confidence}
            onAction={noop}
          />
        )}
        {schedule && (
          <MenuBarExtra.Item
            icon={Icon.Calendar}
            title={schedule.overdue ? "Expected (awaiting)" : "Expected"}
            subtitle={schedule.time}
            onAction={noop}
            tooltip={
              schedule.overdue
                ? "The window has elapsed without a completion confirmation"
                : undefined
            }
          />
        )}
      </MenuBarExtra.Section>
      {record ? (
        <MenuBarExtra.Section
          title={resetToday ? "Confirmed Reset Today" : "Latest Announcement"}
        >
          <MenuBarExtra.Item
            icon={{
              source: recordIcon?.icon ?? Icon.Circle,
              tintColor: recordIcon?.tintColor,
            }}
            title={statusLabel(record)}
            subtitle={`${resetToday ? "Completed" : "Announced"} ${relativeTime(at ?? record.announcedAt)}`}
            tooltip={brief(record.text)}
            onAction={
              record.source?.url
                ? () => open(record.source.url as string)
                : noop
            }
          />
          {record.effectiveAt && (
            <TimeItem
              icon={Icon.Calendar}
              title="Effective"
              iso={record.effectiveAt}
            />
          )}
          {record.completedAt && (
            <TimeItem
              icon={Icon.CheckCircle}
              title="Completed"
              iso={record.completedAt}
            />
          )}
          <MenuBarExtra.Item
            icon={Icon.Tag}
            title="Plans"
            subtitle={record.scope?.plans?.map(humanize).join(", ") || "—"}
            onAction={noop}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={isLoading ? Icon.CircleProgress : Icon.CircleDisabled}
            title={isLoading ? "Loading…" : "No records available"}
            onAction={noop}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Reset Details"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            try {
              await launchCommand({
                name: "latest",
                type: LaunchType.UserInitiated,
              });
            } catch (error) {
              await showFailureToast(error, {
                title: "Failed to open reset details",
              });
            }
          }}
        />
        <MenuBarExtra.Item
          title="Browse Reset History"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          onAction={async () => {
            try {
              await launchCommand({
                name: "history",
                type: LaunchType.UserInitiated,
              });
            } catch (error) {
              await showFailureToast(error, {
                title: "Failed to open reset history",
              });
            }
          }}
        />
        {record?.source?.url && (
          <MenuBarExtra.Item
            title="Open Source Post"
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(record.source.url as string)}
          />
        )}
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item
          title="Preferences…"
          icon={Icon.Gear}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {data?.notificationWarning && (
          <MenuBarExtra.Item
            icon={{ source: Icon.BellDisabled, tintColor: Color.Yellow }}
            title={data.notificationWarning}
            onAction={noop}
          />
        )}
        <MenuBarExtra.Item
          icon={Icon.Filter}
          title="Plan filter"
          subtitle={humanize(plan)}
          onAction={noop}
        />
        {data?.meta?.lastSuccessfulCheckAt && (
          <TimeItem
            icon={Icon.Globe}
            title="Source checked"
            iso={data.meta.lastSuccessfulCheckAt}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
