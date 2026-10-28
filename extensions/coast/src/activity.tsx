import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  topApplications,
  topDomains,
  totalScreenTime,
  usageSessions,
  type UsageItem,
  type UsageSession,
  type UsageTotal,
} from "./coast";
import {
  offsetDate,
  today,
  duration,
  readableTime,
  formatLocalDateTime,
} from "./dates";
import { SessionsView, MomentsView } from "./explore";
import { useAppIcons } from "./app-icons";

type View = "apps" | "domains" | "sessions";
type Range = "today" | "week" | "month";
type Selection = `${Range}:${View}`;

type State = {
  items: UsageItem[];
  sessions: UsageSession[];
  total?: UsageTotal;
  hasMore: boolean;
  isLoading: boolean;
  error?: string;
};

const pageSize = 50;
const automaticPagingLimit = 1_000;

function timerange(range: Range): string {
  if (range === "week") return `since:${offsetDate(6)}`;
  if (range === "month") return `since:${offsetDate(29)}`;
  return today();
}

function selectionTitle(range: Range, view: View): string {
  const rangeTitle =
    range === "today"
      ? "Today"
      : range === "week"
        ? "Last 7 Days"
        : "Last 30 Days";
  const viewTitle =
    view === "apps"
      ? "Applications"
      : view === "domains"
        ? "Domains"
        : "Sessions";
  return `${rangeTitle} - ${viewTitle}`;
}

export default function Command() {
  const request = useRef(0);
  const appIcon = useAppIcons();
  const [selection, setSelection] = useState<Selection>("today:apps");
  const [state, setState] = useState<State>({
    items: [],
    sessions: [],
    hasMore: false,
    isLoading: true,
  });
  const [range, view] = selection.split(":") as [Range, View];

  const load = useCallback(
    async (requestedLimit = pageSize, reset = false) => {
      const id = ++request.current;
      const tr = timerange(range);
      setState((previous) => ({
        ...previous,
        items: reset ? [] : previous.items,
        sessions: reset ? [] : previous.sessions,
        total: reset ? undefined : previous.total,
        hasMore: reset ? false : previous.hasMore,
        isLoading: true,
        error: undefined,
      }));
      try {
        const totalPromise = totalScreenTime(tr);
        if (view === "sessions") {
          const [total, result] = await Promise.all([
            totalPromise,
            usageSessions(tr),
          ]);
          if (id !== request.current) return;
          setState({
            items: [],
            sessions: result.sessions,
            total,
            hasMore: false,
            isLoading: false,
          });
          return;
        }
        const itemsPromise =
          view === "apps"
            ? topApplications(tr, requestedLimit + 1)
            : topDomains(tr, requestedLimit + 1);
        const [total, items] = await Promise.all([totalPromise, itemsPromise]);
        if (id !== request.current) return;
        setState({
          items: items.slice(0, requestedLimit),
          sessions: [],
          total,
          hasMore: items.length > requestedLimit,
          isLoading: false,
        });
      } catch (error) {
        if (id !== request.current) return;
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: message,
        }));
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load usage",
          message,
        });
      }
    },
    [range, view],
  );

  const loadMore = useCallback(
    () => load(Math.max(pageSize, state.items.length + pageSize)),
    [load, state.items.length],
  );

  useEffect(() => {
    load(pageSize, true);
    return () => {
      request.current++;
    };
  }, [load]);

  const dropdown = (
    <List.Dropdown
      tooltip="Range and View"
      storeValue
      value={selection}
      onChange={(value) => setSelection(value as Selection)}
    >
      {(["today", "week", "month"] as Range[]).flatMap((rangeOption) =>
        (["apps", "domains", "sessions"] as View[]).map((viewOption) => (
          <List.Dropdown.Item
            key={`${rangeOption}:${viewOption}`}
            title={selectionTitle(rangeOption, viewOption)}
            value={`${rangeOption}:${viewOption}`}
          />
        )),
      )}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={state.isLoading}
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Filter usage..."
      throttle
      pagination={
        view === "sessions"
          ? undefined
          : {
              pageSize,
              hasMore:
                state.hasMore &&
                !state.isLoading &&
                !state.error &&
                state.items.length < automaticPagingLimit,
              onLoadMore: loadMore,
            }
      }
    >
      <List.EmptyView
        title={state.error ? "Could Not Load Usage" : "No Matching Loaded Rows"}
        description={
          state.error ||
          (state.hasMore
            ? "More ranked rows are available. Load the next page to search those too."
            : "Try another filter or time range.")
        }
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            {state.hasMore ? (
              <Action title="Load More" onAction={loadMore} />
            ) : null}
            <Action title="Retry" onAction={() => load(pageSize, true)} />
          </ActionPanel>
        }
      />
      {state.total ? (
        <List.Section title="Summary">
          <List.Item
            title="Total Screen Time"
            icon={Icon.Clock}
            accessories={[{ text: duration(state.total.recorded_seconds) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Explore Sessions"
                  target={
                    <SessionsView
                      scope={{ tr: timerange(range) }}
                      title="Recorded Sessions"
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Total"
                  content={state.total.recorded_seconds_human}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {view !== "sessions" ? (
        <List.Section
          title={view === "apps" ? "Applications" : "Domains"}
          subtitle={
            state.hasMore
              ? `${state.items.length} loaded · more available`
              : undefined
          }
        >
          {state.items.map((item) => (
            <List.Item
              key={item.identifier}
              icon={view === "apps" ? appIcon(item.identifier) : Icon.Globe}
              title={item.display_name || item.identifier}
              accessories={[{ text: duration(item.recorded_seconds) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Explore Sessions"
                    target={
                      <SessionsView
                        title={item.display_name || item.identifier}
                        scope={{
                          tr: timerange(range),
                          ...(view === "apps"
                            ? { appFilters: [item.identifier] }
                            : { domainFilters: [item.identifier] }),
                        }}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy"
                    content={`${item.display_name || item.identifier}: ${item.recorded_seconds_human}`}
                  />
                </ActionPanel>
              }
            />
          ))}
          {state.error && state.items.length > 0 ? (
            <List.Item
              title="Could Not Load More"
              subtitle={state.error}
              icon={Icon.ExclamationMark}
              actions={
                <ActionPanel>
                  <Action title="Retry Loading More" onAction={loadMore} />
                </ActionPanel>
              }
            />
          ) : null}
          {state.hasMore && !state.isLoading && !state.error ? (
            <List.Item
              title="Load More"
              subtitle={
                state.items.length >= automaticPagingLimit
                  ? "Automatic paging paused for safety"
                  : `${state.items.length} currently loaded`
              }
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action title="Load More" onAction={loadMore} />
                </ActionPanel>
              }
            />
          ) : null}
        </List.Section>
      ) : (
        <List.Section title="Sessions">
          {state.sessions.map((session) => (
            <List.Item
              key={`${session.start_ms}:${session.end_ms}`}
              icon={Icon.Calendar}
              title={readableTime(session.start)}
              accessories={[{ text: duration(session.duration_seconds) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Explore Session"
                    target={
                      <MomentsView
                        scope={{
                          tr: `${formatLocalDateTime(new Date(session.start_ms))}|${formatLocalDateTime(new Date(session.end_ms))}`,
                        }}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy"
                    content={`${session.start} - ${session.end} (${session.duration_human})`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
