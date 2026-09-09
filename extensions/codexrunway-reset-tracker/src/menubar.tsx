import {
  Color,
  Icon,
  MenuBarExtra,
  open,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchMenuRecords } from "./notifications";
import {
  formatDate,
  recordsUrl,
  relativeTime,
  resetTodayIn,
  statusLabel,
  matchesPlan,
  nextScheduleIn,
  scheduleLabel,
  humanize,
} from "./api";

/** One request serves both the latest record and the reset-today scan (API allows 20/hour). */
const PAGE_SIZE = 10;

export default function Command() {
  const { plan, iconOnly, notifyResets } = getPreferenceValues<{
    plan: string;
    iconOnly: boolean;
    notifyResets: boolean;
  }>();
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
  const { resetToday, at, record: todayRecord } = resetTodayIn(records);
  const record = todayRecord ?? records[0];

  const title = warning
    ? "Update failed"
    : record
      ? resetToday
        ? "Reset today"
        : next
          ? "Reset scheduled"
          : "No reset confirmed"
      : "CodexRunway";

  return (
    <MenuBarExtra
      icon={{
        source: warning
          ? Icon.ExclamationMark
          : resetToday
            ? Icon.CheckCircle
            : Icon.Circle,
        tintColor: warning
          ? Color.Yellow
          : resetToday
            ? Color.Green
            : Color.SecondaryText,
      }}
      title={iconOnly ? undefined : title}
      isLoading={isLoading}
      tooltip={`${title} · ${humanize(plan)} · Latest 10 records; local times`}
    >
      {record ? (
        <MenuBarExtra.Section
          title={resetToday ? "Confirmed Reset Today" : "Latest Announcement"}
        >
          {warning && <MenuBarExtra.Item title={warning} />}
          <MenuBarExtra.Item title={statusLabel(record)} />
          {at && <MenuBarExtra.Item title={`Confirmed ${relativeTime(at)}`} />}
          {record.effectiveAt && (
            <MenuBarExtra.Item
              title={`Effective: ${formatDate(record.effectiveAt)} (${relativeTime(record.effectiveAt)})`}
            />
          )}
          {record.completedAt && (
            <MenuBarExtra.Item
              title={`Completed: ${formatDate(record.completedAt)} (${relativeTime(record.completedAt)})`}
            />
          )}
          <MenuBarExtra.Item
            title={`Plans: ${record.scope?.plans?.join(", ") || "-"}`}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item
          title={
            isLoading ? "Loading…" : warning ? warning : "No records available"
          }
        />
      )}
      <MenuBarExtra.Section title="Next Planned Reset">
        <MenuBarExtra.Item title={scheduleLabel(next)} />
        {next && <MenuBarExtra.Item title={statusLabel(next)} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Reset Details"
          icon={Icon.Document}
          onAction={() =>
            launchCommand({ name: "latest", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Browse Reset History"
          icon={Icon.List}
          onAction={() =>
            launchCommand({ name: "history", type: LaunchType.UserInitiated })
          }
        />
        {record?.source?.url && (
          <MenuBarExtra.Item
            title="Open Source Post"
            icon={Icon.Link}
            onAction={() => open(record.source.url as string)}
          />
        )}
        <MenuBarExtra.Item
          title="Preferences…"
          icon={Icon.Gear}
          onAction={openCommandPreferences}
        />
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
      {data?.notificationWarning && (
        <MenuBarExtra.Item
          title={data.notificationWarning}
          icon={Icon.ExclamationMark}
        />
      )}
      <MenuBarExtra.Item title={`Plan filter: ${humanize(plan)}`} />
      {data?.meta?.lastSuccessfulCheckAt && (
        <MenuBarExtra.Item
          title={`Source checked: ${formatDate(data.meta.lastSuccessfulCheckAt)}`}
        />
      )}
    </MenuBarExtra>
  );
}
