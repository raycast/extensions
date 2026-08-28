import { Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { katoApi } from "./api";
import { formatDueDate, formatMeetingTime } from "./dates";
import { ErrorActions } from "./error-actions";
import { accessTokenOptions } from "./oauth";
import { TaskActions } from "./task-actions";
import { recordAvatar } from "./icons";
import { RecordActions } from "./record-actions";
import type {
  MeetingSearchResult,
  SearchResult,
  TaskSearchResult,
  TaskStatus,
} from "./types";
import { MeetingActions } from "./upcoming-meetings";
import {
  formatRecordDetailFields,
  recordDetailMarkdown,
} from "./detail-format";

type Filter = "all" | "task" | "record" | "meeting";

function SearchActions({
  result,
  statuses,
  onMutated,
}: {
  result: SearchResult;
  statuses: TaskStatus[];
  onMutated?: () => void;
}) {
  if (result.kind === "task")
    return (
      <TaskActions
        task={{
          ...result.task,
          id: result.id,
          title: result.title,
          webUrl: result.webUrl,
        }}
        statuses={statuses}
        onUpdated={onMutated ? () => onMutated() : undefined}
      />
    );
  if (result.kind === "meeting")
    return <MeetingActions meeting={result.meeting} />;
  return <RecordActions record={result} />;
}

function itemIcon(result: SearchResult) {
  if (result.kind === "task")
    return { source: Icon.CheckCircle, tintColor: Color.Blue };
  if (result.kind === "meeting")
    return {
      source: result.meeting.joinUrl ? Icon.Video : Icon.Calendar,
      tintColor: Color.Purple,
    };
  return recordAvatar(result.title, result.avatarUrl, result.record.color);
}

function SearchItem({
  result,
  statuses,
  onMutated,
}: {
  result: SearchResult;
  statuses: TaskStatus[];
  onMutated?: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  const recordFields =
    result.kind === "record"
      ? formatRecordDetailFields(result.record.meta)
      : [];
  if (result.kind === "task") {
    const due = formatDueDate(result.task.dueDate);
    if (due) accessories.push({ text: due });
  } else if (result.kind === "meeting")
    accessories.push({ text: formatMeetingTime(result.meeting) });
  if (result.badge) accessories.push({ tag: result.badge });

  return (
    <List.Item
      icon={itemIcon(result)}
      title={result.title}
      subtitle={result.subtitle ?? undefined}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={
            result.kind === "record"
              ? recordDetailMarkdown(result.title, result.record.objectTypeName)
              : result.kind === "meeting"
                ? result.meeting.description || "_No description_"
                : result.subtitle || "_No description_"
          }
          metadata={
            <List.Item.Detail.Metadata>
              {result.kind !== "record" ? (
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={result.kind}
                />
              ) : null}
              {result.kind === "task" ? (
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={result.task.status}
                />
              ) : null}
              {recordFields.length ? (
                <List.Item.Detail.Metadata.Separator />
              ) : null}
              {recordFields.map((field) => (
                <List.Item.Detail.Metadata.Label
                  key={field.label}
                  title={field.label}
                  text={field.value}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Kato"
                target={result.webUrl}
                text="Open record"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <SearchActions
          result={result}
          statuses={statuses}
          onMutated={onMutated}
        />
      }
    />
  );
}

function SearchKatoCommand() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    katoApi
      .statuses()
      .then(setStatuses)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(
      async () => {
        setError(undefined);
        if (query.trim().length === 1) {
          setResults([]);
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
          if (query.trim().length >= 2) {
            const types = filter === "all" ? [] : [filter];
            setResults(
              await katoApi.search(query.trim(), types, controller.signal),
            );
          } else {
            const [tasks, meetings, records] = await Promise.all([
              katoApi.tasks(),
              katoApi.upcomingMeetings(),
              katoApi.recentRecords(controller.signal),
            ]);
            const urgent: TaskSearchResult[] = tasks
              .filter(
                (task) =>
                  task.priority === "urgent" ||
                  (task.dueDate && new Date(task.dueDate) < new Date()),
              )
              .slice(0, 8)
              .map((task) => ({
                kind: "task",
                id: task.id,
                title: task.title,
                subtitle: task.description,
                badge: task.status,
                webUrl: task.webUrl,
                task: {
                  status: task.status,
                  priority: task.priority,
                  dueDate: task.dueDate,
                },
              }));
            const nextMeetings: MeetingSearchResult[] = meetings
              .slice(0, 5)
              .map((meeting) => ({
                kind: "meeting",
                id: meeting.id,
                title: meeting.title,
                subtitle: meeting.location,
                badge: meeting.calendarName ?? "Meeting",
                webUrl: meeting.webUrl,
                meeting,
              }));
            setResults(
              filter === "task"
                ? urgent
                : filter === "meeting"
                  ? nextMeetings
                  : filter === "record"
                    ? records
                    : [...urgent, ...records.slice(0, 8), ...nextMeetings],
            );
          }
        } catch (cause) {
          if ((cause as Error).name !== "AbortError")
            setError((cause as Error).message);
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      },
      query.trim().length >= 2 ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter, refreshNonce]);

  const sections = useMemo(
    () => ({
      task: results.filter((result) => result.kind === "task"),
      record: results.filter((result) => result.kind === "record"),
      meeting: results.filter((result) => result.kind === "meeting"),
    }),
    [results],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="Search Workspace…"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter results"
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Tasks" value="task" />
          <List.Dropdown.Item title="Records" value="record" />
          <List.Dropdown.Item title="Meetings" value="meeting" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could not search Kato"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions
              command="search-kato"
              onRetry={() => setRefreshNonce((value) => value + 1)}
            />
          }
        />
      ) : null}
      {!error && query.trim().length === 1 ? (
        <List.EmptyView
          title="Keep typing"
          description="Enter at least two characters to search Kato."
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {!error &&
      !isLoading &&
      query.trim().length >= 2 &&
      results.length === 0 ? (
        <List.EmptyView
          title="No results"
          description={`Nothing in Kato matched “${query.trim()}”.`}
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {(["task", "record", "meeting"] as const).map((kind) =>
        sections[kind].length ? (
          <List.Section
            key={kind}
            title={
              query.trim()
                ? `${kind}s`
                : kind === "task"
                  ? "Urgent Tasks"
                  : kind === "record"
                    ? "Recent Records"
                    : "Next Meetings"
            }
          >
            {sections[kind].map((result) => (
              <SearchItem
                key={`${result.kind}-${result.id}`}
                result={result}
                statuses={statuses}
                onMutated={() => setRefreshNonce((value) => value + 1)}
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

export default withAccessToken(accessTokenOptions)(SearchKatoCommand);
