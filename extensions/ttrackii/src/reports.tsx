import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { report, resources } from "./lib/api";
import { useWorkspaces } from "./lib/hooks";
import {
  bar,
  duration,
  formatDay,
  formatMoney,
  percentChange,
  TIMEFRAMES,
  timeframeRange,
  type Timeframe,
} from "./lib/domain";
import { message } from "./lib/actions";
import { origin, read, sessionKey, write, type Snapshot } from "./lib/store";
import { useAuth, withAuth } from "./components/auth";
import {
  AccountSection,
  projectIcon,
  RefreshAction,
  tagIcon,
} from "./components/shared";
import type { Group, Report, Resources } from "./lib/types";

// Each timeframe costs two requests (period + comparison); keep them briefly.
// Keyed by session (every personal workspace is "personal"), so a report can
// never be shown to another account, even one written by a request that
// finished after a sign-out. Sign-out and sign-in also wipe the cache.
const CACHE_MS = 2 * 60_000;

function share(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
}

function Reports() {
  const auth = useAuth();
  const ws = useWorkspaces();
  const [timeframe, setTimeframe] = useState<Timeframe>("this-week");
  const [data, setData] = useState<[Report, Report]>();
  const [available, setAvailable] = useState<Resources>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const range = timeframeRange(timeframe);

  useEffect(() => {
    if (!ws.workspaceId) return;
    const workspaceId = ws.workspaceId;
    const run = ++generation.current;
    setError("");
    setLoading(true);
    void (async () => {
      const key = `report:${await sessionKey()}|${workspaceId}|${range.from}|${range.to}`;
      const saved =
        revision === 0
          ? await read<Snapshot<[Report, Report]>>(key)
          : undefined;
      if (generation.current !== run) return;
      if (saved && Date.now() - saved.savedAt < CACHE_MS) {
        setData(saved.data);
        return;
      }
      const [currentPeriod, previousPeriod, lookup] = await Promise.all([
        report(workspaceId, range.from, range.to),
        report(workspaceId, range.previousFrom, range.previousTo),
        resources(workspaceId).catch(() => undefined),
      ]);
      if (generation.current !== run) return;
      setData([currentPeriod, previousPeriod]);
      setAvailable(lookup);
      await write(key, {
        savedAt: Date.now(),
        data: [currentPeriod, previousPeriod],
      });
    })()
      .catch((error) => {
        if (generation.current !== run || auth.handle(error)) return;
        setData(undefined);
        setError(message(error));
      })
      .finally(() => {
        if (generation.current === run) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [ws.workspaceId, range.from, range.to, revision]);

  useEffect(() => {
    if (!ws.workspaceId || available) return;
    void resources(ws.workspaceId)
      .then(setAvailable)
      .catch(() => undefined);
  }, [ws.workspaceId, available]);

  const refresh = useCallback(() => {
    setRevision((v) => v + 1);
    void ws.reload();
  }, [ws.reload]);

  const workspaces = ws.data?.workspaces ?? [];
  const workspace = workspaces.find((w) => w.id === ws.workspaceId);
  const actions = (
    <ActionPanel>
      <RefreshAction onAction={refresh} />
      {workspaces.length > 1 && (
        <ActionPanel.Submenu
          title="Change Workspace"
          icon={Icon.TwoPeople}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        >
          {workspaces.map((w) => (
            <Action
              key={w.id}
              title={w.kind === "personal" ? "Personal" : w.name}
              icon={w.id === ws.workspaceId ? Icon.Checkmark : undefined}
              onAction={() => {
                setAvailable(undefined);
                ws.select(w.id);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action.OpenInBrowser
        title="Open Reports in ttrackii"
        url={`${origin()}/reports`}
      />
      <AccountSection />
    </ActionPanel>
  );

  const [currentPeriod, previousPeriod] = data ?? [];
  const summary = currentPeriod?.summary;
  const total = summary?.totalDurationMs ?? 0;
  const change = percentChange(
    total,
    previousPeriod?.summary.totalDurationMs ?? 0,
  );
  const byDay = summary?.byDay ?? [];
  const busiest = [...byDay].sort((a, b) => b.durationMs - a.durationMs)[0];
  const top = (groups?: Group[]) =>
    groups?.find((group) => group.name !== "Unassigned");
  const colorOf = (kind: "projects" | "tags", name: string) =>
    available?.[kind].find((item) => item.name === name)?.color;
  const timeframeTitle = TIMEFRAMES.find((t) => t.id === timeframe)?.title;
  const breakdown = (
    title: string,
    groups: Group[] | undefined,
    icon: (name: string) => List.Item.Props["icon"],
    subtitle?: string,
  ) =>
    groups && groups.length > 0 ? (
      <List.Section title={title} subtitle={subtitle}>
        {groups.map((group) => (
          <List.Item
            key={group.name}
            title={group.name}
            icon={icon(group.name)}
            accessories={[
              {
                text: bar(
                  group.durationMs,
                  Math.max(...groups.map((other) => other.durationMs)),
                ),
              },
              { text: share(group.durationMs, total) },
              {
                text: duration(group.durationMs),
                tooltip: `${group.entries} ${group.entries === 1 ? "entry" : "entries"}`,
              },
            ]}
            actions={actions}
          />
        ))}
      </List.Section>
    ) : null;

  return (
    <List
      isLoading={ws.loading || loading}
      navigationTitle={`Reports${workspace && workspaces.length > 1 ? ` · ${workspace.kind === "personal" ? "Personal" : workspace.name}` : ""}`}
      searchBarPlaceholder="Filter projects, tags, and days"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Timeframe"
          value={timeframe}
          storeValue
          onChange={(value) => setTimeframe(value as Timeframe)}
        >
          {TIMEFRAMES.map((t) => (
            <List.Dropdown.Item key={t.id} value={t.id} title={t.title} />
          ))}
        </List.Dropdown>
      }
    >
      {(ws.error || error) && !data ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title="Couldn't load the report"
          description={ws.error || error}
          actions={actions}
        />
      ) : (
        <List.EmptyView
          icon={Icon.BarChart}
          title={`No time tracked ${timeframeTitle?.toLowerCase() ?? ""}`}
          description="Pick another timeframe from the dropdown."
          actions={actions}
        />
      )}
      {summary && total > 0 && (
        <>
          <List.Section
            title="Overview"
            subtitle={
              range.from === range.to
                ? formatDay(range.from)
                : `${formatDay(range.from)} – ${formatDay(range.to)}`
            }
          >
            <List.Item
              title="Total Time"
              icon={Icon.Clock}
              accessories={[
                ...(change !== undefined
                  ? [
                      {
                        tag: {
                          value: `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%`,
                          color: change >= 0 ? Color.Green : Color.Orange,
                        },
                        tooltip: `Previous period: ${duration(previousPeriod!.summary.totalDurationMs)}`,
                      },
                    ]
                  : []),
                { text: duration(total) },
              ]}
              actions={actions}
            />
            {range.days > 1 && (
              <List.Item
                title="Daily Average"
                icon={Icon.Calendar}
                accessories={[{ text: duration(total / range.days) }]}
                actions={actions}
              />
            )}
            <List.Item
              title="Entries"
              icon={Icon.List}
              accessories={[{ text: String(summary.entryCount) }]}
              actions={actions}
            />
            {(summary.billableTotals ?? []).map((amount) => (
              <List.Item
                key={amount.currency}
                title="Billable"
                icon={Icon.Coins}
                accessories={[
                  { text: formatMoney(amount.amountMinor, amount.currency) },
                ]}
                actions={actions}
              />
            ))}
          </List.Section>
          <List.Section title="Insights">
            {range.days > 1 && busiest && (
              <List.Item
                title="Busiest Day"
                subtitle={formatDay(busiest.date)}
                icon={Icon.Bolt}
                accessories={[{ text: duration(busiest.durationMs) }]}
                actions={actions}
              />
            )}
            {top(summary.byProject) && (
              <List.Item
                title="Top Project"
                subtitle={top(summary.byProject)!.name}
                icon={projectIcon(
                  colorOf("projects", top(summary.byProject)!.name),
                )}
                accessories={[
                  { text: share(top(summary.byProject)!.durationMs, total) },
                ]}
                actions={actions}
              />
            )}
            {top(summary.byTag) && (
              <List.Item
                title="Top Tag"
                subtitle={top(summary.byTag)!.name}
                icon={tagIcon(colorOf("tags", top(summary.byTag)!.name))}
                accessories={[
                  { text: share(top(summary.byTag)!.durationMs, total) },
                ]}
                actions={actions}
              />
            )}
            {top(summary.byTask) && (
              <List.Item
                title="Top Task"
                subtitle={top(summary.byTask)!.name}
                icon={Icon.CheckCircle}
                accessories={[
                  { text: duration(top(summary.byTask)!.durationMs) },
                ]}
                actions={actions}
              />
            )}
          </List.Section>
          {breakdown("Projects", summary.byProject, (name) =>
            name === "Unassigned"
              ? Icon.Circle
              : projectIcon(colorOf("projects", name)),
          )}
          {breakdown(
            "Tags",
            summary.byTag,
            (name) =>
              name === "Unassigned"
                ? Icon.Circle
                : tagIcon(colorOf("tags", name)),
            "Entries with several tags count toward each",
          )}
          {range.days > 1 &&
            range.days <= 31 &&
            breakdown(
              "Days",
              byDay.map((day) => ({ ...day, name: formatDay(day.date) })),
              () => Icon.Calendar,
            )}
          {breakdown("Tasks", summary.byTask?.slice(0, 10), () => Icon.Dot)}
        </>
      )}
    </List>
  );
}

export default withAuth(Reports, <List isLoading />);
