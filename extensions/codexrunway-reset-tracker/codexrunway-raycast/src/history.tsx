import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  RecordsResponse,
  ResetKind,
  ResetRecord,
  formatDate,
  recordsUrl,
  relativeTime,
  statusLabel,
} from "./api";
import { confidenceColor, statusIcon } from "./status";

const PAGE_SIZE = 10;

export default function Command() {
  const [kind, setKind] = useState<ResetKind>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useFetch<RecordsResponse>(
    recordsUrl(kind, page, PAGE_SIZE),
    {
      keepPreviousData: true,
    },
  );

  const records = data?.data?.items ?? [];
  const total = data?.data?.total;
  const hasNextPage =
    data?.data?.hasNext ??
    (total ? page * PAGE_SIZE < total : records.length === PAGE_SIZE);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter by reset type or text…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by kind"
          value={kind}
          onChange={(value) => {
            setKind(value as ResetKind);
            setPage(1);
          }}
        >
          <List.Dropdown.Item title="All Kinds" value="all" />
          <List.Dropdown.Item title="Scheduled" value="reset_scheduled" />
          <List.Dropdown.Item title="Completed" value="reset_completed" />
        </List.Dropdown>
      }
    >
      {records.map((record) => (
        <RecordItem key={record.id} record={record} />
      ))}
      <List.Section
        title={`Page ${page}${total ? ` of ${Math.max(1, Math.ceil(total / PAGE_SIZE))}` : ""}`}
      >
        {page > 1 && (
          <List.Item
            title="← Previous Page"
            icon={Icon.ArrowLeft}
            actions={
              <ActionPanel>
                <Action
                  title="Previous Page"
                  onAction={() => setPage((p) => Math.max(1, p - 1))}
                />
              </ActionPanel>
            }
          />
        )}
        {hasNextPage && (
          <List.Item
            title="Next Page →"
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action
                  title="Next Page"
                  onAction={() => setPage((p) => p + 1)}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}

function RecordItem({ record }: { record: ResetRecord }) {
  const when = record.completedAt ?? record.effectiveAt ?? record.announcedAt;
  const { icon, tintColor } = statusIcon(record);

  const accessories: List.Item.Props["accessories"] = [
    { tag: { value: record.resetType, color: Color.SecondaryText } },
  ];
  if (when) accessories.push({ date: new Date(when) });

  return (
    <List.Item
      icon={{ source: icon, tintColor }}
      title={statusLabel(record)}
      subtitle={record.text?.split("\n")[0] ?? ""}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={
            record.text
              ? `> ${record.text.split("\n").join("\n> ")}`
              : "_No announcement text for this record._"
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Kind"
                text={record.kind}
              />
              <List.Item.Detail.Metadata.Label
                title="Reset Type"
                text={record.resetType}
              />
              {record.scheduleState && (
                <List.Item.Detail.Metadata.Label
                  title="Schedule State"
                  text={record.scheduleState}
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Announced"
                text={
                  record.announcedAt
                    ? `${formatDate(record.announcedAt)} (${relativeTime(record.announcedAt)})`
                    : "-"
                }
              />
              {record.effectiveAt && (
                <List.Item.Detail.Metadata.Label
                  title="Effective"
                  text={`${formatDate(record.effectiveAt)} (${relativeTime(record.effectiveAt)})`}
                />
              )}
              {record.completedAt && (
                <List.Item.Detail.Metadata.Label
                  title="Completed"
                  text={`${formatDate(record.completedAt)} (${relativeTime(record.completedAt)})`}
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Plans">
                {(record.scope?.plans ?? []).map((plan) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={plan}
                    text={plan}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {record.confidence != null && (
                <List.Item.Detail.Metadata.TagList title="Confidence">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`${Math.round(record.confidence * 100)}%`}
                    color={confidenceColor(record.confidence)}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {record.source?.url && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Source"
                    target={record.source.url}
                    text={
                      record.source.handle
                        ? `@${record.source.handle}`
                        : record.source.origin
                    }
                  />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {record.source?.url && (
            <Action.OpenInBrowser
              title="Open Source Post"
              url={record.source.url}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Raw JSON"
            content={JSON.stringify(record, null, 2)}
          />
        </ActionPanel>
      }
    />
  );
}
