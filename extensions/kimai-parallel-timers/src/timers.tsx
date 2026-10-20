import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { Entry, duration, nameOf, projectColor } from "./api";
import { client, perform } from "./shared";
import EntryForm from "./entry-form";
import { recentEntryDate } from "./dates";
import { periodStarts, timeSummary } from "./summary";
export default function Timers({
  onlyActive = false,
  edit = false,
}: {
  onlyActive?: boolean;
  edit?: boolean;
}) {
  const api = client();
  const { recentDateFormat, showTimerSummary = true } = getPreferenceValues<{
    recentDateFormat?: string;
    showTimerSummary?: boolean;
  }>();
  const [, tick] = useState(0);
  const [pages, setPages] = useState(1);
  const {
    data,
    isLoading,
    revalidate: refreshTimers,
  } = usePromise(
    async (count: number) => {
      const [active, historyPages] = await Promise.all([
        api.active(),
        onlyActive
          ? Promise.resolve([])
          : Promise.all(
              Array.from({ length: count }, (_, i) => api.historyPage(i + 1)),
            ),
      ]);
      return {
        active,
        history: historyPages.flat(),
        more: historyPages.at(-1)?.length === 100,
      };
    },
    [pages],
  );
  const summaryVisible = showTimerSummary && !onlyActive && !edit;
  const {
    data: summaryHistory,
    error: summaryError,
    revalidate: refreshSummary,
  } = usePromise(
    async () => {
      const starts = periodStarts();
      return api.historySince(
        new Date(
          Math.min(
            starts.yesterday.getTime(),
            starts.week.getTime(),
            starts.month.getTime(),
          ),
        ),
      );
    },
    [],
    { execute: summaryVisible },
  );
  const revalidate = useCallback(async () => {
    await Promise.all([
      refreshTimers(),
      ...(summaryVisible ? [refreshSummary()] : []),
    ]);
  }, [refreshTimers, refreshSummary, summaryVisible]);
  useEffect(() => {
    const timer = setInterval(() => {
      tick((n) => n + 1);
      void revalidate();
    }, 30000);
    return () => clearInterval(timer);
  }, [revalidate]);
  const active = data?.active ?? [];
  const summary =
    summaryHistory && data
      ? timeSummary([...summaryHistory, ...active])
      : undefined;
  const recent = (data?.history ?? []).filter(
    (e) => !active.some((a) => a.id === e.id),
  );
  const actions = (e?: Entry) => (
    <ActionPanel>
      {e &&
        (edit ? (
          <Action.Push
            title="Edit Entry"
            target={<EntryForm entry={e} refresh={revalidate} />}
          />
        ) : !e.end ? (
          <Action
            title="Stop This Timer"
            icon={Icon.Stop}
            onAction={() =>
              perform("Stop timer", () => api.stop(e.id), revalidate)
            }
          />
        ) : (
          <Action
            title="Resume as Parallel Timer"
            icon={Icon.Play}
            onAction={() =>
              perform("Resume timer", () => api.resume(e), revalidate)
            }
          />
        ))}
      <Action.Push
        title="Start New Timer"
        icon={Icon.Plus}
        target={<EntryForm refresh={revalidate} />}
        shortcut={Keyboard.Shortcut.Common.New}
      />
      {e && !edit && (
        <Action.Push
          title="Edit Entry"
          target={<EntryForm entry={e} refresh={revalidate} />}
          shortcut={Keyboard.Shortcut.Common.Edit}
        />
      )}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action.OpenInBrowser title="Open Kimai" url={api.base} />
      {active.length > 0 && (
        <Action
          title="Stop All Timers"
          style={Action.Style.Destructive}
          onAction={async () => {
            if (
              await confirmAlert({
                title: `Stop all ${active.length} timers?`,
                primaryAction: {
                  title: "Stop All",
                  style: Alert.ActionStyle.Destructive,
                },
              })
            )
              await perform("Stop all timers", () => api.stopAll(), revalidate);
          }}
        />
      )}
    </ActionPanel>
  );
  const row = (e: Entry) => (
    <List.Item
      key={e.id}
      title={e.description || "(No description)"}
      subtitle={nameOf(e.project)}
      keywords={[
        nameOf(e.activity),
        ...(e.tags ?? []).map((t) => (typeof t === "string" ? t : t.name)),
      ]}
      icon={{
        source: Icon.Circle,
        tintColor:
          projectColor(e.project) ||
          (!e.end ? Color.Green : Color.SecondaryText),
      }}
      accessories={[
        { text: duration(e) },
        {
          text: !e.end ? "Running" : recentEntryDate(e.begin, recentDateFormat),
        },
      ]}
      actions={actions(e)}
    />
  );
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search description, project, activity or tags"
      actions={actions()}
    >
      {summaryVisible && (
        <List.Item
          title={
            summaryError
              ? "Could not load summary — refresh"
              : summary
                ? `Today: ${summary.today} · Yesterday: ${summary.yesterday} · Week: ${summary.week} · Month: ${summary.month}`
                : "Loading summary…"
          }
          actions={actions()}
        />
      )}
      <List.Section title={`Running timers (${active.length})`}>
        {active.map(row)}
      </List.Section>
      {!onlyActive && (
        <List.Section title="Recent entries">{recent.map(row)}</List.Section>
      )}
      {!onlyActive && data?.more && (
        <List.Item
          title="Load Older Entries"
          icon={Icon.Ellipsis}
          actions={
            <ActionPanel>
              <Action
                title="Load Older Entries"
                onAction={() => setPages((p) => p + 1)}
              />
            </ActionPanel>
          }
        />
      )}
      <List.EmptyView
        title={onlyActive ? "No running timers" : "No time entries"}
        description="Press ⌘N to start a timer. If loading failed, check the error toast and connection settings."
        actions={actions()}
      />
    </List>
  );
}
