import { useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchHistory, FetchedRecords } from "./requests";
import {
  ResetKind,
  ResetRecord,
  formatDate,
  relativeTime,
  statusLabel,
  recordState,
  matchesPlan,
  humanize,
  matchesSearch,
  recordTime,
  formatWindow,
} from "./api";
import { confidenceColor, statusIcon } from "./status";

export default function Command() {
  const [kind, setKind] = useState<ResetKind>("all");
  const [plan, setPlan] = useState<string>(
    getPreferenceValues<Preferences.History>().plan,
  );
  const [searchText, setSearchText] = useState("");

  const { data, error, isLoading, revalidate, pagination } = useCachedPromise(
    fetchHistory,
    [kind],
    { keepPreviousData: false },
  );
  const entries = [
    ...new Map((data ?? []).map((entry) => [entry.page, entry])).values(),
  ];
  const pages = entries
    .map((entry) => entry.result)
    .filter((result): result is FetchedRecords => result !== undefined);
  const warning =
    error?.message ?? entries.find((entry) => entry.warning)?.warning;
  const loaded = [
    ...new Map(
      pages
        .flatMap((page) => page.data.items)
        .map((record) => [record.id, record]),
    ).values(),
  ];
  const records = loaded
    .filter(
      (record) =>
        matchesPlan(record, plan) && matchesSearch(record, searchText),
    )
    .sort((a, b) => recordTime(b) - recordTime(a));
  const checkedAt = new Map(
    pages.flatMap((page) =>
      page.data.items.map(
        (record) => [record.id, page.meta?.lastSuccessfulCheckAt] as const,
      ),
    ),
  );
  const groups = new Map<string, ResetRecord[]>();
  for (const record of records) {
    const date = new Date(
      record.completedAt ?? record.effectiveAt ?? record.announcedAt ?? "",
    );
    const day = Number.isNaN(date.getTime())
      ? "Date unknown"
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)?.push(record);
  }
  const hasMore = Boolean(pagination?.hasMore) && !warning;
  const pageActions = (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => revalidate()}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      {!isLoading && pagination?.hasMore && (
        <Action
          title={warning ? "Retry Failed Page" : "Load More Records"}
          icon={Icon.ArrowDown}
          onAction={() => pagination?.onLoadMore()}
          shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
        />
      )}
      <ActionPanel.Submenu title={`Plan: ${humanize(plan)}`} icon={Icon.Person}>
        {["all", "free", "plus", "pro", "team", "business", "enterprise"].map(
          (value) => (
            <Action
              key={value}
              title={value === "all" ? "All Plans" : humanize(value)}
              icon={plan === value ? Icon.Checkmark : Icon.Circle}
              onAction={() => setPlan(value)}
            />
          ),
        )}
      </ActionPanel.Submenu>
      {(searchText || kind !== "all" || plan !== "all") && (
        <Action
          title="Clear Filters"
          icon={Icon.XMarkCircle}
          onAction={() => {
            setSearchText("");
            setKind("all");
            setPlan("all");
          }}
        />
      )}
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`Reset History · ${humanize(plan)} · ${records.length} matching · ${loaded.length} loaded${warning ? " · Update failed" : ""}`}
      pagination={
        pagination
          ? {
              ...pagination,
              pageSize: 10,
              hasMore: hasMore && !searchText && plan === "all",
            }
          : undefined
      }
      searchBarPlaceholder="Search loaded records by type, plan, or text…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={<ActionPanel>{pageActions}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by kind"
          value={kind}
          onChange={(value) => {
            setKind(value as ResetKind);
          }}
        >
          <List.Dropdown.Item title="All Kinds" value="all" />
          <List.Dropdown.Item title="Scheduled" value="reset_scheduled" />
          <List.Dropdown.Item title="Completed" value="reset_completed" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={warning ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          isLoading
            ? "Loading records…"
            : warning
              ? "Unable to load records"
              : searchText
                ? "No matching loaded records"
                : "No reset records"
        }
        description={
          warning
            ? warning
            : "Search covers loaded records. Use Actions to load more records or clear filters."
        }
        actions={<ActionPanel>{pageActions}</ActionPanel>}
      />
      {[...groups].map(([day, items]) => (
        <List.Section key={day} title={day} subtitle={warning}>
          {items.map((record) => (
            <RecordItem
              key={record.id}
              record={record}
              pageActions={pageActions}
              checkedAt={checkedAt.get(record.id)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function RecordItem({
  record,
  pageActions,
  checkedAt,
}: {
  record: ResetRecord;
  pageActions: List.Item.Props["actions"];
  checkedAt?: string;
}) {
  const { icon, tintColor } = statusIcon(record);

  return (
    <List.Item
      icon={{ source: icon, tintColor }}
      title={statusLabel(record)}
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
                title="Status"
                text={recordState(record)}
              />
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
              <List.Item.Detail.Metadata.Label
                title="Usage Windows"
                text={record.scope?.windows?.join(", ") || "Not specified"}
              />
              {record.scheduleWindow && (
                <List.Item.Detail.Metadata.Label
                  title="Expected Window"
                  text={formatWindow(record.scheduleWindow)}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Source Last Checked"
                text={formatDate(checkedAt)}
              />
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
          {pageActions}
          <Action.CopyToClipboard
            title="Copy Raw JSON"
            content={JSON.stringify(record, null, 2)}
          />
        </ActionPanel>
      }
    />
  );
}
