import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { ProjectDropdown } from "./projects";
import { useEffect, useRef, useState } from "react";
import { ExplorerClient } from "../lib/explorer-api";
import {
  DateRange,
  boundedRevenueRange,
  calendarDate,
  utcTodayForDatePicker,
  REVENUE_PAGE_SIZE,
  RevenueDay,
  reserveRevenueRequest,
  revenueDayPage,
  revenueRange,
  utcDate,
  shiftDate,
} from "../lib/revenue-history";
import { usePaged } from "../hooks/data";
import { CommonActions, Context } from "./common";

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}
function dateLabel(date: string, today: string) {
  if (date === today) return "Today";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  });
}
function CustomRange({ onSelect }: { onSelect: (range: DateRange) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Filter Revenue by Date"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Date Range"
            onSubmit={(values: { start?: Date; end?: Date }) => {
              if (!values.start || !values.end) {
                setError("Choose a start and end date.");
                return;
              }
              const start = calendarDate(values.start),
                end = calendarDate(values.end);
              if (start > end || end > utcDate()) {
                setError("Choose a range ending today (UTC) or earlier, with the start before the end.");
                return;
              }
              onSelect({ start, end });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="start" title="Start Date (UTC)" type={Form.DatePicker.Type.Date} error={error} />
      <Form.DatePicker
        id="end"
        title="End Date (UTC)"
        type={Form.DatePicker.Type.Date}
        defaultValue={utcTodayForDatePicker()}
      />
    </Form>
  );
}
export function Trends({ context }: { context: Context }) {
  const [period, setPeriod] = useState("all");
  const [custom, setCustom] = useState<DateRange>();
  const cache = useRef(new Map<string, number>());
  const today = utcDate();
  const range = period === "custom" && custom ? custom : revenueRange(period, today);
  const requestKey = `${context.project.id}:revenue:${context.currency}:${context.demo}:${range.start || context.project.created_at || "all"}:${range.end}`;
  const [waiting, setWaiting] = useState<{ key: string; until?: number }>();
  const waitingUntil = waiting?.key === requestKey ? waiting.until : undefined;
  const state = usePaged<RevenueDay>(requestKey, async (next, signal) =>
    revenueDayPage(
      boundedRevenueRange(range, context.project.created_at),
      next,
      async (batch) => {
        const prefix = `${context.project.id}:${context.currency}:${context.demo}:`;
        const dates: string[] = [];
        for (let date = batch.end; date >= batch.start; date = shiftDate(date, -1)) dates.push(date);
        if (dates.every((date) => cache.current.has(prefix + date)))
          return dates.map((id) => ({ id, value: cache.current.get(prefix + id)! }));
        let days: RevenueDay[];
        if (context.demo) {
          days = dates.map((id) => ({ id, value: [124, 167, 96, 202, 148, 238, 181][new Date(id).getUTCDay()] }));
        } else {
          await reserveRevenueRequest(context.project.id, signal, (until) => setWaiting({ key: requestKey, until }));
          days = await new ExplorerClient(context.apiKey).dailyRevenue(
            context.project.id,
            batch,
            context.currency,
            signal,
          );
        }
        signal.throwIfAborted();
        for (const day of days) cache.current.set(prefix + day.id, day.value);
        return days;
      },
      signal,
    ),
  );
  const rateLimitUntil = state.loading ? waitingUntil : undefined;
  useEffect(() => {
    if (!rateLimitUntil) return;
    let cancelled = false;
    let toast: Toast | undefined;
    void showToast({
      style: Toast.Style.Animated,
      title: "RevenueCat rate limit",
      message: `Loading resumes automatically at ${new Date(rateLimitUntil).toLocaleTimeString()}`,
    })
      .then((shown) => {
        toast = shown;
        if (cancelled) void shown.hide();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void toast?.hide();
    };
  }, [rateLimitUntil]);
  function refresh() {
    cache.current.clear();
    state.refresh();
  }
  function actions(value?: number) {
    return (
      <ActionPanel>
        {value !== undefined && (
          <Action.CopyToClipboard title="Copy Revenue" content={money(value, context.currency)} />
        )}
        <ActionPanel.Submenu
          title="Date Range"
          icon={Icon.Filter}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "f" },
            Windows: { modifiers: ["ctrl", "shift"], key: "f" },
          }}
        >
          {[
            ["all", "All"],
            ["7d", "Last 7 Days"],
            ["30d", "Last 30 Days"],
            ["90d", "Last 90 Days"],
            ["month", "This Month"],
            ["year", "This Year"],
          ].map(([value, title]) => (
            <Action
              key={value}
              title={title}
              icon={period === value ? Icon.Checkmark : Icon.Calendar}
              onAction={() => setPeriod(value)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action.Push
          title="Filter by Date Range"
          icon={Icon.Calendar}
          target={
            <CustomRange
              onSelect={(selected) => {
                setCustom(selected);
                setPeriod("custom");
              }}
            />
          }
        />
        {period !== "all" && <Action title="Show All Dates" icon={Icon.List} onAction={() => setPeriod("all")} />}
        <CommonActions refresh={refresh} />
      </ActionPanel>
    );
  }
  return (
    <List
      navigationTitle="Revenue Trends"
      isLoading={state.loading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="Daily revenue, newest first…"
      pagination={{
        pageSize: REVENUE_PAGE_SIZE,
        hasMore: Boolean(state.next) && !state.error,
        onLoadMore: state.loadMore,
      }}
      searchBarAccessory={<ProjectDropdown context={context} command="revenue-trends" />}
    >
      <List.EmptyView
        icon={state.error ? Icon.ExclamationMark : Icon.Calendar}
        title={
          state.error
            ? "Revenue history unavailable"
            : state.loading
              ? "Loading revenue history…"
              : "No dates in this range"
        }
        description={state.error}
        actions={actions()}
      />
      <List.Section
        title="Daily Revenue"
        subtitle={period === "all" ? "All · UTC" : `${range.start} – ${range.end} · UTC`}
      >
        {state.items.map((day) => (
          <List.Item
            key={day.id}
            id={day.id}
            title={dateLabel(day.id, today)}
            icon={Icon.Calendar}
            accessories={[
              {
                text: money(day.value, context.currency),
                tooltip: day.id === today ? "Today’s revenue so far (UTC)" : undefined,
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Gross Revenue" text={money(day.value, context.currency)} />
                    <List.Item.Detail.Metadata.Label title="Date (UTC)" text={day.id} />
                    <List.Item.Detail.Metadata.Label title="Currency" text={context.currency} />
                    {day.id === today && <List.Item.Detail.Metadata.Label title="Status" text="In progress" />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions(day.value)}
          />
        ))}
      </List.Section>
      {state.items.length > 0 && state.error && (
        <List.Item
          id="retry"
          title="Couldn’t Load Older Days"
          subtitle={state.error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={state.loadMore} />
              <CommonActions refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
