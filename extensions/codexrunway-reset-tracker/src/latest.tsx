import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRecords } from "./requests";
import {
  formatDate,
  formatWindow,
  recordsUrl,
  relativeTime,
  resetTodayIn,
  statusLabel,
  matchesPlan,
  nextScheduleIn,
  scheduleLabel,
  humanize,
  recordState,
} from "./api";
import { confidenceColor } from "./status";

/** One request serves both the latest record and the reset-today scan (API allows 20/hour). */
const PAGE_SIZE = 10;

export default function Command() {
  const { plan } = getPreferenceValues<{ plan: string }>();
  const { data, error, isLoading, revalidate } = useCachedPromise(
    fetchRecords,
    [recordsUrl("all", 1, PAGE_SIZE)],
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

  const markdown = record
    ? [
        warning
          ? `**Update failed — showing previously fetched data.**\n\n${warning}`
          : "",
        `# ${resetToday ? `Reset confirmed today · ${relativeTime(at)}` : "No reset confirmed today"}`,
        `Plan: ${humanize(plan)} · Based on the latest 10 records. Times are local.`,
        "",
        "## Next planned reset",
        next
          ? `${statusLabel(next)} — ${scheduleLabel(next)}`
          : scheduleLabel(),
        "",
        `## ${resetToday ? "Confirmed reset" : "Latest announcement"}`,
        `**${statusLabel(record)}**`,
        "",
        record.text ? `> ${record.text.split("\n").join("\n> ")}` : "",
        "",
        record.source.url
          ? `Source: [${record.source.handle ?? record.source.origin} on ${record.source.origin}](${record.source.url})`
          : `Source: ${record.source.origin}`,
      ].join("\n")
    : isLoading
      ? "Loading latest reset record…"
      : warning
        ? `# Unable to load reset records\n\n${warning}\n\nTry refreshing with ⌘R.`
        : `# No reset records for ${humanize(plan)}\n\nNo matching record in the latest 10 announcements. Change the plan in extension preferences or browse history.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        record ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={recordState(record)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Announced At"
              text={
                record.announcedAt
                  ? `${formatDate(record.announcedAt)} (${relativeTime(record.announcedAt)})`
                  : "-"
              }
            />
            {record.effectiveAt && (
              <Detail.Metadata.Label
                title="Effective At"
                text={`${formatDate(record.effectiveAt)} (${relativeTime(record.effectiveAt)})`}
              />
            )}
            {record.completedAt && (
              <Detail.Metadata.Label
                title="Completed At"
                text={`${formatDate(record.completedAt)} (${relativeTime(record.completedAt)})`}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Plans">
              {(record.scope?.plans ?? []).map((plan) => (
                <Detail.Metadata.TagList.Item key={plan} text={plan} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Usage Windows"
              text={record.scope?.windows?.join(", ") || "Not specified"}
            />
            {record.scheduleWindow && (
              <Detail.Metadata.Label
                title="Expected Window"
                text={formatWindow(record.scheduleWindow)}
              />
            )}
            <Detail.Metadata.Label
              title="Source Last Checked"
              text={formatDate(data?.meta?.lastSuccessfulCheckAt)}
            />
            {record.confidence != null && (
              <Detail.Metadata.TagList title="Confidence">
                <Detail.Metadata.TagList.Item
                  text={`${Math.round(record.confidence * 100)}%`}
                  color={confidenceColor(record.confidence)}
                />
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            {record.source.url ? (
              <Detail.Metadata.Link
                title="Source"
                target={record.source.url}
                text={
                  record.source.handle
                    ? `@${record.source.handle}`
                    : record.source.origin
                }
              />
            ) : (
              <Detail.Metadata.Label
                title="Source"
                text={record.source.origin}
              />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {record?.source?.url && (
            <Action.OpenInBrowser
              title="Open Source Post"
              url={record.source.url}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action
            title="Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          {record && (
            <Action.CopyToClipboard
              title="Copy Raw JSON"
              content={JSON.stringify(record, null, 2)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
