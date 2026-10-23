import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { entries, resources, startTimer, stopTimer, timer } from "./lib/api";
import { useWorkspaces } from "./lib/hooks";
import {
  clock,
  dayLabel,
  defaultRate,
  duration,
  elapsed,
  formatRate,
  timeRange,
} from "./lib/domain";
import { message, refreshMenuBar } from "./lib/actions";
import { useAuth, withAuth } from "./components/auth";
import {
  AccountSection,
  dotIcon,
  RefreshAction,
  tagColor,
} from "./components/shared";
import { StartTimerForm, type StartTimerDraft } from "./start-timer";
import type {
  Billing,
  Entry,
  EntriesPage,
  Resources,
  Timer,
} from "./lib/types";

// Server search costs API quota (50/hour on the free plan), so it waits for a
// pause in typing; loaded entries are filtered instantly in the meantime.
const SEARCH_DELAY = 500;
const MIN_SERVER_QUERY = 2;

function matches(entry: Entry, query: string) {
  const needle = query.toLowerCase();
  return [entry.taskName, entry.projectName, ...(entry.tagNames ?? [])].some(
    (value) => value?.toLowerCase().includes(needle),
  );
}

function RecentEntries() {
  const auth = useAuth();
  const ws = useWorkspaces();
  const [page, setPage] = useState<EntriesPage>();
  const [current, setCurrent] = useState<Timer>();
  const [available, setAvailable] = useState<Resources>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, EntriesPage>>({});
  const [searching, setSearching] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const busy = useRef(false);
  const query = search.trim();

  useEffect(() => {
    if (!ws.workspaceId) return;
    const run = ++generation.current;
    setLoading(true);
    setError("");
    setResults({});
    inFlight.current = false;
    void Promise.all([
      entries(ws.workspaceId),
      timer(),
      // Colors and rates are decoration only; a lookup failure must not hide entries.
      resources(ws.workspaceId).catch(() => undefined),
    ])
      .then(([result, running, lookup]) => {
        if (generation.current !== run) return;
        setPage(result);
        setCurrent(running);
        setAvailable(lookup);
      })
      .catch((error) => {
        if (generation.current !== run || auth.handle(error)) return;
        setPage(undefined);
        setError(message(error));
      })
      .finally(() => {
        if (generation.current === run) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [ws.workspaceId, revision]);

  useEffect(() => {
    if (!current?.running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [current?.running]);

  useEffect(() => {
    if (!ws.workspaceId || query.length < MIN_SERVER_QUERY || results[query])
      return;
    const run = generation.current;
    const wait = setTimeout(() => {
      setSearching(true);
      void entries(ws.workspaceId, query)
        .then((result) => {
          if (generation.current === run)
            setResults((cached) => ({ ...cached, [query]: result }));
        })
        .catch((error) => {
          if (generation.current !== run || auth.handle(error)) return;
          void showToast({
            style: Toast.Style.Failure,
            title: "Couldn't search entries",
            message: message(error),
          });
        })
        .finally(() => setSearching(false));
    }, SEARCH_DELAY);
    return () => clearTimeout(wait);
  }, [query, ws.workspaceId, results]);

  const searched = query ? results[query] : undefined;
  async function more() {
    const source = query ? searched : page;
    if (!source?.nextCursor || inFlight.current) return;
    inFlight.current = true;
    const run = generation.current;
    const key = query;
    setLoading(true);
    try {
      const next = await entries(ws.workspaceId, key, source.nextCursor);
      if (generation.current !== run) return;
      const merge = (previous?: EntriesPage) => ({
        nextCursor: next.nextCursor,
        entries: [
          ...(previous?.entries ?? []),
          ...next.entries.filter(
            (entry) => !previous?.entries.some((old) => old.id === entry.id),
          ),
        ],
      });
      if (key)
        setResults((cached) => ({ ...cached, [key]: merge(cached[key]) }));
      else setPage(merge);
    } catch (error) {
      if (generation.current === run && !auth.handle(error))
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load more entries",
          message: message(error),
        });
    } finally {
      if (generation.current === run) {
        setLoading(false);
        inFlight.current = false;
      }
    }
  }
  const refresh = useCallback(() => {
    setRevision((v) => v + 1);
    void ws.reload();
  }, [ws.reload]);

  async function mutate(
    pending: string,
    done: (result: Timer) => string,
    failed: string,
    run: () => Promise<Timer>,
  ) {
    if (busy.current) return;
    busy.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: pending,
    });
    try {
      const result = await run();
      toast.style = Toast.Style.Success;
      toast.title = done(result);
      await refreshMenuBar();
      refresh();
    } catch (error) {
      if (auth.handle(error)) return void toast.hide();
      toast.style = Toast.Style.Failure;
      toast.title = failed;
      toast.message = message(error);
      // The outcome of a failed mutation is unknown; show what the server has now.
      refresh();
    } finally {
      busy.current = false;
    }
  }
  const stop = () =>
    mutate(
      "Stopping timer…",
      (result) =>
        `Stopped “${result.entry?.taskName || "Untitled"}” · ${duration(result.elapsedMs)}`,
      "Couldn't stop timer",
      stopTimer,
    );

  const project = (id?: string | null) =>
    available?.projects.find((p) => p.id === id);
  const tagsOf = (entry: Entry) =>
    (entry.tagIds ?? []).map(
      (id, index) =>
        available?.tags.find((t) => t.id === id) ?? {
          id,
          name: entry.tagNames?.[index] ?? "Tag",
          color: null,
          clientId: null,
          projectId: null,
        },
    );
  /** Repeat the entry's rate choice: a custom rate stays custom, an opted-out entry stays non-billable. */
  function billingOf(entry: Entry): Billing {
    if (
      entry.billingSource === "custom" &&
      entry.billingRateMinor != null &&
      entry.billingCurrency
    )
      return {
        mode: "custom",
        billingRateMinor: entry.billingRateMinor,
        billingCurrency: entry.billingCurrency,
      };
    const wouldBill = defaultRate(project(entry.projectId), tagsOf(entry));
    return !entry.isBillable && wouldBill
      ? { mode: "none" }
      : { mode: "default" };
  }
  const draftOf = (entry: Entry): StartTimerDraft => ({
    workspaceId: entry.workspaceId ?? ws.workspaceId,
    taskName: entry.taskName,
    projectId: entry.projectId ?? null,
    tagIds: entry.tagIds ?? [],
    billing: billingOf(entry),
  });
  const resume = (entry: Entry) =>
    mutate(
      "Starting timer…",
      () => `Continuing “${entry.taskName || "Untitled"}”`,
      "Couldn't start timer",
      () =>
        startTimer({
          workspaceId: ws.workspaceId,
          taskName: entry.taskName,
          projectId: entry.projectId ?? null,
          tagIds: entry.tagIds ?? [],
          billing: billingOf(entry),
        }),
    );

  const workspace = ws.data?.workspaces.find((w) => w.id === ws.workspaceId);
  const running = current?.running ? current : undefined;
  const startAction = (
    <Action.Push
      title="Start New Timer"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<StartTimerForm onStarted={refresh} />}
    />
  );
  const footer = (
    <>
      <ActionPanel.Section>
        <RefreshAction onAction={refresh} />
      </ActionPanel.Section>
      <AccountSection />
    </>
  );
  const listed = query
    ? (searched?.entries ??
      (page?.entries ?? []).filter((entry) => matches(entry, query)))
    : (page?.entries ?? []).filter((entry) => entry.id !== running?.entry?.id);
  const days = new Map<string, Entry[]>();
  for (const entry of listed) {
    const label = dayLabel(entry.startTime);
    days.set(label, [...(days.get(label) ?? []), entry]);
  }
  const source = query ? searched : page;
  const failed = Boolean((ws.error || error) && !page);

  const accessories = (entry: Entry): List.Item.Accessory[] => {
    const tags = tagsOf(entry);
    return [
      ...tags.slice(0, 2).map((tag) => ({
        tag: { value: tag.name, color: tagColor(tag.color) },
      })),
      ...(tags.length > 2
        ? [
            {
              text: `+${tags.length - 2}`,
              tooltip: tags
                .slice(2)
                .map((t) => t.name)
                .join(", "),
            },
          ]
        : []),
      ...(entry.isBillable &&
      entry.billingRateMinor != null &&
      entry.billingCurrency
        ? [
            {
              icon: { source: Icon.Coins, tintColor: Color.SecondaryText },
              tooltip: `Billable · ${formatRate(entry.billingRateMinor, entry.billingCurrency)}`,
            },
          ]
        : []),
      entry.isRunning
        ? { tag: { value: "Running", color: Color.Green } }
        : {
            text: duration(entry.durationMs),
            tooltip: timeRange(entry.startTime, entry.endTime),
          },
    ];
  };

  return (
    <List
      isLoading={ws.loading || loading || searching}
      filtering={false}
      throttle
      onSearchTextChange={setSearch}
      navigationTitle="Recent Entries"
      searchBarPlaceholder="Search tasks, projects, and tags"
      pagination={
        source
          ? {
              hasMore: Boolean(source.nextCursor),
              onLoadMore: more,
              pageSize: 50,
            }
          : undefined
      }
      searchBarAccessory={
        (ws.data?.workspaces.length ?? 0) > 1 ? (
          <List.Dropdown
            tooltip="Workspace"
            value={ws.workspaceId}
            onChange={ws.select}
          >
            {ws.data?.workspaces.map((w) => (
              <List.Dropdown.Item
                key={w.id}
                value={w.id}
                title={w.kind === "personal" ? "Personal" : w.name}
                icon={w.kind === "personal" ? Icon.Person : Icon.TwoPeople}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {failed ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title="Couldn't load entries"
          description={ws.error || error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <AccountSection />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={query ? Icon.MagnifyingGlass : Icon.Clock}
          title={query ? `No entries match “${query}”` : "No time entries yet"}
          description={
            query
              ? searching || (query.length >= MIN_SERVER_QUERY && !searched)
                ? "Searching all entries…"
                : "Try a task, project, or tag name."
              : "Press ↵ to start a timer."
          }
          actions={
            <ActionPanel>
              {startAction}
              {footer}
            </ActionPanel>
          }
        />
      )}
      {!query && running?.entry && (
        <List.Section title="Running">
          <List.Item
            title={running.entry.taskName || "Untitled"}
            subtitle={running.entry.projectName ?? undefined}
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            accessories={[
              ...accessories(running.entry).slice(0, -1),
              ...(running.entry.workspaceId !== ws.workspaceId
                ? [{ tag: running.entry.workspaceName ?? "Personal" }]
                : []),
              {
                text: {
                  value: clock(elapsed(running, now)),
                  color: Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Stop Timer" icon={Icon.Stop} onAction={stop} />
                <Action.Push
                  title="Edit Running Timer…"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <StartTimerForm
                      onStarted={refresh}
                      editing={{ entryId: running.entry.id }}
                      draft={draftOf(running.entry)}
                    />
                  }
                />
                {startAction}
                {footer}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {[...days].map(([label, group]) => (
        <List.Section
          key={label}
          title={label}
          subtitle={duration(
            group.reduce((total, entry) => total + entry.durationMs, 0),
          )}
        >
          {group.map((entry) => (
            <List.Item
              key={entry.id}
              title={entry.taskName || "Untitled"}
              subtitle={entry.projectName ?? undefined}
              icon={dotIcon(
                entry.projectColor ?? project(entry.projectId)?.color,
              )}
              accessories={accessories(entry)}
              actions={
                <ActionPanel>
                  {workspace?.writable && (
                    <Action
                      title="Continue Timer"
                      icon={Icon.Play}
                      onAction={() => resume(entry)}
                    />
                  )}
                  {workspace?.writable && (
                    <Action.Push
                      title="Edit and Start…"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <StartTimerForm
                          onStarted={refresh}
                          draft={draftOf(entry)}
                        />
                      }
                    />
                  )}
                  {running && (
                    <Action
                      title="Stop Running Timer"
                      icon={Icon.Stop}
                      onAction={stop}
                    />
                  )}
                  {startAction}
                  <Action.CopyToClipboard
                    title="Copy Task Name"
                    content={entry.taskName || "Untitled"}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {footer}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default withAuth(RecentEntries, <List isLoading />);
