import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LatestResponse, formatDate, latestUrl, relativeTime } from "./api";
import { confidenceColor, useResetToday } from "./status";

export default function Command() {
  const { data, isLoading, revalidate } = useFetch<LatestResponse>(
    latestUrl("all"),
    {
      keepPreviousData: true,
    },
  );

  const record = data?.data;
  const { resetToday } = useResetToday(record);

  const markdown = record
    ? [
        `# ${resetToday ? "✅ Reset today" : "◻︎ No reset yet today"}`,
        "",
        `**${record.resetType.toUpperCase()}** — ${record.kind.replace("reset_", "")}`,
        "",
        record.text ? `> ${record.text.split("\n").join("\n> ")}` : "",
        "",
        record.source.url
          ? `Source: [${record.source.handle ?? record.source.origin} on ${record.source.origin}](${record.source.url})`
          : `Source: ${record.source.origin}`,
      ].join("\n")
    : "Loading latest reset record…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        record ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Kind" text={record.kind} />
            <Detail.Metadata.Label title="Reset Type" text={record.resetType} />
            {record.scheduleState && (
              <Detail.Metadata.Label
                title="Schedule State"
                text={record.scheduleState}
              />
            )}
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
            shortcut={{ modifiers: ["cmd"], key: "r" }}
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
