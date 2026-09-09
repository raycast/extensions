import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { RecordsResponse, formatDate, recordsUrl, relativeTime } from "./api";
import { resetTodayIn } from "./status";

/** One request serves both the latest record and the reset-today scan (API allows 20/hour). */
const PAGE_SIZE = 10;

export default function Command() {
  const { data, isLoading, revalidate } = useFetch<RecordsResponse>(
    recordsUrl("all", 1, PAGE_SIZE),
    {
      keepPreviousData: true,
    },
  );

  const records = data?.data?.items ?? [];
  const record = records[0];
  const { resetToday, at } = resetTodayIn(records);

  const title = record
    ? resetToday
      ? `Reset today · ${relativeTime(at)}`
      : "No reset today"
    : "CodexRunway";

  return (
    <MenuBarExtra
      icon={{
        source: resetToday ? Icon.CheckCircle : Icon.Circle,
        tintColor: resetToday ? Color.Green : Color.SecondaryText,
      }}
      title={title}
      isLoading={isLoading}
      tooltip="CodexRunway reset status"
    >
      {record ? (
        <MenuBarExtra.Section title="Latest Record">
          <MenuBarExtra.Item title={`Kind: ${record.kind}`} />
          <MenuBarExtra.Item title={`Reset type: ${record.resetType}`} />
          {record.scheduleState && (
            <MenuBarExtra.Item
              title={`Schedule state: ${record.scheduleState}`}
            />
          )}
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
          title={isLoading ? "Loading…" : "No data available"}
        />
      )}
      <MenuBarExtra.Section>
        {record?.source?.url && (
          <MenuBarExtra.Item
            title="Open Source Post"
            icon={Icon.Link}
            onAction={() => open(record.source.url as string)}
          />
        )}
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
