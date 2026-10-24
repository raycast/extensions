import {
  List,
  Detail,
  Action,
  ActionPanel,
  Icon,
  Color,
  showToast,
  Toast,
  Keyboard,
  Clipboard,
  launchCommand,
  LaunchType,
  Form,
  confirmAlert,
  Alert,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { fetchPRsWithActivity, getFetchLimits } from "./api";
import { loadSeen, saveSeen, markItemSeen, markPRSeen, markAllSeen } from "./seen";
import { loadCachedPRs, saveCachedPRs } from "./cache";
import { getDemoPRs } from "./demo-data";
import {
  loadEventFilters,
  saveEventFilters,
  defaultFilters,
  ALL_ACTIVITY_TYPES,
  type EventFilters,
} from "./event-filters";
import {
  getUnseenActivity,
  getAllActivity,
  renderActivityMarkdown,
  renderPRSummaryMarkdown,
  computePrsWithUnseen,
  toMenuBarPrs,
  type MenuBarPr,
} from "./utils";
import type { ActivityItem, PRWithActivity, SeenMap } from "./types";
import { prKey } from "./types";
import { viewLog as log, getErrorMessage } from "./logger";
import { writeMenuBarCache } from "./menu-bar-cache";
import {
  loadPrFilters,
  savePrFilters,
  loadActiveFilterId,
  saveActiveFilterId,
  resolveActivePrFilter,
  type PrFilter,
} from "./pr-filters";
import type { CompiledPrFilter } from "./pr-filter-query";

type FetchResult = Awaited<ReturnType<typeof fetchPRsWithActivity>>;

// Raycast's development renderer replays effect setup in the same microtask. Keep that one
// expensive request shared; a later user revalidate must still start a fresh request.
let viewMountFetch: Promise<FetchResult> | undefined;

// Monotonic counter identifying the newest fetch. Results from an older generation are discarded
// rather than published — see the guard in fetchAndSync.
let latestFetchGeneration = 0;

function fetchLatestPRs(): Promise<FetchResult> {
  if (viewMountFetch) return viewMountFetch;

  const request = (async () => {
    const seen = await loadSeen();
    const filters = await loadEventFilters();
    const prFilter = await resolveActivePrFilter();
    return fetchPRsWithActivity({ seen, filters, prFilter, source: "view" });
  })();
  viewMountFetch = request;
  queueMicrotask(() => {
    if (viewMountFetch === request) viewMountFetch = undefined;
  });
  return request;
}

// ─── Review state → color mapping ───────────────────────────────────────────

const STATE_COLOR: Record<string, Color> = {
  APPROVED: Color.Green,
  CHANGES_REQUESTED: Color.Red,
  COMMENTED: Color.Yellow,
  DISMISSED: Color.SecondaryText,
  PENDING: Color.Blue,
};

const STATE_ICON: Record<string, Icon> = {
  APPROVED: Icon.Checkmark,
  CHANGES_REQUESTED: Icon.XMarkCircle,
  COMMENTED: Icon.Bubble,
  DISMISSED: Icon.MinusCircle,
  PENDING: Icon.Clock,
};

// ─── Determine if a review_comment is a reply ────────────────────────────────

function isReplyComment(item: ActivityItem, pr: PRWithActivity): boolean {
  if (item.type !== "review_comment") return false;

  // Explicit reply chain
  if (item.inReplyToId) return true;

  // Heuristic: another review comment exists on the same path+line that was
  // created before this one — this comment is part of a conversation thread
  if (item.path) {
    const earlier = pr.reviewComments.find(
      (c) =>
        c.id !== item.id &&
        c.path === item.path &&
        (c.line ?? c.original_line) === item.line &&
        new Date(c.created_at).getTime() < new Date(item.date).getTime(),
    );
    if (earlier) return true;
  }

  return false;
}

// ─── Main command ────────────────────────────────────────────────────────────

/**
 * Push the freshly computed unread list to the menu-bar command so it re-renders.
 * Called after data fetches (view open / revalidate) and after mark-as-read actions, so the
 * badge count stays in sync with what the list shows. Mark handlers call this fire-and-forget
 * (see syncMenuBar) so the local UI update isn't blocked by the launchCommand spawn cost.
 *
 * The computed list is passed via launchContext (not just a "refresh" flag) so the menu-bar
 * command can render synchronously from it. A background-launched menu-bar command only gets a
 * short execution window; if it had to await an async cache read before rendering, that read
 * would race the window and the badge would keep its stale value (observed in Store builds,
 * whose window is tighter than local development's).
 */
async function refreshMenuBar(items: MenuBarPr[]): Promise<void> {
  // Publish to the shared Cache FIRST, so the payload is available synchronously even if the
  // launch below throws — which it does in Store installs where the menu-bar command has not yet
  // been activated for background refresh (§1). The cache write is the durable half of this
  // handoff; launchCommand is only the nudge to re-render.
  writeMenuBarCache(items);
  try {
    log.debug("Pushing unread list to menu bar", { count: items.length });
    await launchCommand({
      name: "unread-menu-bar",
      type: LaunchType.Background,
      context: { source: "view-refresh", items },
    });
    log.debug("Menu bar launch succeeded");
  } catch (error) {
    // The menu-bar command may be disabled, or — in a Store install — not yet activated for
    // background refresh, in which case launchCommand throws. Swallowing this silently is what
    // made the "badge never updates in Store builds" bug undiagnosable; log it, don't toast
    // (this fires on every refresh and is non-fatal to the list itself).
    log.warn("Menu bar launch failed — badge will be stale", {
      error: getErrorMessage(error),
      itemCount: items.length,
    });
  }
}

type FocusContext = { focusPrKey?: string };

export default function UnreadUpdates(props: LaunchProps<{ launchContext?: FocusContext }>) {
  const focusPrKey = props.launchContext?.focusPrKey;
  const [seenMap, setSeenMap] = useState<SeenMap>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [displayPrs, setDisplayPrs] = useState<PRWithActivity[] | undefined>(undefined);
  const [demoMode, setDemoMode] = useState(false);
  const [demoSeenMap, setDemoSeenMap] = useState<SeenMap>({});
  const [eventFilters, setEventFilters] = useState<EventFilters>(defaultFilters());
  const [prFilters, setPrFilters] = useState<PrFilter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>(undefined);

  // Load cached PRs, seen state, event filters, and saved PR filters on mount
  useEffect(() => {
    Promise.all([loadCachedPRs(), loadSeen(), loadEventFilters(), loadPrFilters(), loadActiveFilterId()]).then(
      ([cached, seen, filters, savedFilters, activeId]) => {
        setSeenMap(seen);
        setEventFilters(filters);
        setPrFilters(savedFilters);
        setActiveFilterId(activeId);
        if (cached) {
          setDisplayPrs(cached);
          const allCollapsed: Record<string, boolean> = {};
          for (const pr of cached) allCollapsed[prKey(pr)] = prKey(pr) !== focusPrKey;
          setCollapsed(allCollapsed);
        }
      },
    );
  }, []);

  // usePromise treats its function as a latest-value ref; its documented trigger is the argument
  // array, not function identity. This callback only keeps `focusPrKey` current for the local
  // collapsed-state update below.
  const fetchAndSync = useCallback(async () => {
    // Generation guard: ⌘R during an in-flight fetch starts a second one. Without this, whichever
    // finishes LAST wins — and that can be the OLDER request, overwriting newer data in the cache,
    // LocalStorage, and React state. Only the newest generation is allowed to publish.
    const generation = ++latestFetchGeneration;
    const { prs: fetchedPrs, activeKeys, activeKeysComplete } = await fetchLatestPRs();
    if (generation !== latestFetchGeneration) {
      log.debug("Discarding superseded fetch result", { generation, latest: latestFetchGeneration });
      return;
    }

    // Reload seen + filters after the (potentially long) fetch so marks and filter toggles made
    // during it aren't overwritten, and the pushed menu-bar count matches what the list now renders.
    const fetchedSeen = await loadSeen();
    const freshFilters = await loadEventFilters();
    const freshPrFilter = await resolveActivePrFilter();
    if (generation !== latestFetchGeneration) return;
    // Only prune closed-PR seen state when the fetch walked every open PR. Pruning against a
    // partial key set deletes read history for still-open PRs that simply weren't scanned.
    await saveSeen(fetchedSeen, activeKeysComplete ? new Set(activeKeys) : undefined);
    setSeenMap(fetchedSeen);
    await saveCachedPRs(fetchedPrs);
    // Push the freshly computed unread list to the menu-bar command so it re-renders
    // synchronously — see refreshMenuBar for why.
    await refreshMenuBar(toMenuBarPrs(computePrsWithUnseen(fetchedPrs, fetchedSeen, freshFilters, freshPrFilter)));

    setDisplayPrs(fetchedPrs);
    // Preserve existing collapsed state; default new PRs to collapsed
    setCollapsed((prev) => {
      const updated: Record<string, boolean> = {};
      for (const pr of fetchedPrs) {
        const key = prKey(pr);
        // DO NOT change to force-expand focusPrKey here (AI reviewers keep suggesting this).
        // The mount effect (~line 120) already expands the focused PR via
        // `allCollapsed[prKey(pr)] = prKey(pr) !== focusPrKey`. This updater must ONLY
        // preserve existing collapsed state and default NEW PRs to collapsed. Forcing
        // focusPrKey to expanded on every revalidate (Cmd+R) re-expands PRs the user
        // deliberately collapsed — a regression, not a fix.
        updated[key] = prev[key] !== undefined ? prev[key] : key !== focusPrKey;
      }
      return updated;
    });
    // focusPrKey is the only outer value read here; everything else is a setState or module import.
  }, [focusPrKey]);

  const { isLoading, revalidate, error } = usePromise(fetchAndSync);

  useEffect(() => {
    if (error) {
      const isRateLimit = error.message.includes("rate limit");
      showToast({
        style: Toast.Style.Failure,
        title: isRateLimit ? "GitHub rate limit reached" : "Failed to fetch PR data",
        message: error.message,
        primaryAction: {
          title: "Copy Error",
          shortcut: Keyboard.Shortcut.Common.Copy,
          onAction: () => Clipboard.copy(error.message),
        },
      });
    }
  }, [error]);

  const activeFilter = prFilters.find((f) => f.id === activeFilterId);
  const [compiledFilter, setCompiledFilter] = useState<CompiledPrFilter | undefined>(undefined);

  // Recompiles whenever the active filter selection changes (dropdown) or the active filter's
  // own query is edited. Re-reads from storage via resolveActivePrFilter rather than deriving
  // from `activeFilter` directly, so it's correct even on a render where prFilters/activeFilterId
  // haven't both settled from the mount load yet. Also re-syncs the menu-bar badge once the new
  // filter is ready, mirroring how Event Filter toggles and mark-as-read actions already push a
  // fresh count — skipped before the first fetch resolves, since the mount fetch's own push (in
  // fetchAndSync) covers that case.
  useEffect(() => {
    let cancelled = false;
    resolveActivePrFilter().then((compiled) => {
      if (cancelled) return;
      setCompiledFilter(compiled);
      if (displayPrs !== undefined) {
        void refreshMenuBar(toMenuBarPrs(computePrsWithUnseen(displayPrs, seenMap, eventFilters, compiled)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeFilterId, prFilters]);

  const activePrs = demoMode ? getDemoPRs() : displayPrs;
  const activeSeenMap = demoMode ? demoSeenMap : seenMap;
  const { maxUnread } = getFetchLimits();

  const prsWithUnseen = computePrsWithUnseen(activePrs ?? [], activeSeenMap, eventFilters, compiledFilter).slice(
    0,
    maxUnread,
  );

  // Distinguishes "genuinely caught up" from "you filtered everything out" — otherwise hiding
  // every event type produces an "All caught up!" screen that is actively misleading.
  const allFiltersOff = Object.values(eventFilters).every((enabled) => !enabled);

  // A PR filter is active, event filters aren't the (more fundamental) cause, and nothing remains
  // after narrowing — whether the filter hit zero at fetch time or display time, show the same
  // actionable empty state.
  const prFilterExcludedEverything = !!compiledFilter && !allFiltersOff && prsWithUnseen.length === 0;

  // The last refresh errored AND left nothing to show. Distinguishes an outage from a genuine
  // zero, which are otherwise identical once the failure toast has faded.
  const fetchFailed = !demoMode && error !== undefined && displayPrs === undefined;

  const toggleCollapse = (pr: PRWithActivity) => {
    const key = prKey(pr);
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    prsWithUnseen.forEach(({ pr }) => {
      all[prKey(pr)] = true;
    });
    setCollapsed(all);
  };

  const expandAll = () => {
    setCollapsed({});
  };

  // Keep the menu-bar badge in sync with mark actions. Fire-and-forget: the local seen state is
  // already updated for instant UI, so pushing to the menu bar must not block the handler.
  // refreshMenuBar swallows its own errors, so the floating promise is safe.
  const syncMenuBar = (seen: SeenMap) => {
    void refreshMenuBar(toMenuBarPrs(computePrsWithUnseen(displayPrs ?? [], seen, eventFilters, compiledFilter)));
  };

  const handleMarkItemSeen = async (pr: PRWithActivity, item: ActivityItem) => {
    if (demoMode) {
      setDemoSeenMap((prev) => {
        const key = prKey(pr);
        const existing = prev[key] ?? {
          lastSeen: new Date().toISOString(),
          seenItemIds: [],
        };
        return {
          ...prev,
          [key]: {
            ...existing,
            seenItemIds: [...existing.seenItemIds, item.itemKey],
          },
        };
      });
      return;
    }
    const updated = await markItemSeen(pr, item);
    setSeenMap(updated);
    syncMenuBar(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Item marked as seen",
    });
  };

  const handleMarkPRSeen = async (pr: PRWithActivity) => {
    if (demoMode) {
      setDemoSeenMap((prev) => {
        const key = prKey(pr);
        const allItems = getAllActivity(pr);
        return {
          ...prev,
          [key]: {
            lastSeen: new Date().toISOString(),
            seenItemIds: allItems.map((i) => i.itemKey),
          },
        };
      });
      return;
    }
    const updated = await markPRSeen(pr);
    setSeenMap(updated);
    syncMenuBar(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "PR marked as caught up",
    });
  };

  const handleMarkAllSeen = async () => {
    if (demoMode) {
      const demoPrs = getDemoPRs();
      const newMap: SeenMap = {};
      for (const pr of demoPrs) {
        const allItems = getAllActivity(pr);
        newMap[prKey(pr)] = {
          lastSeen: new Date().toISOString(),
          seenItemIds: allItems.map((i) => i.itemKey),
        };
      }
      setDemoSeenMap(newMap);
      return;
    }
    if (!displayPrs) return;
    const updated = await markAllSeen(displayPrs);
    setSeenMap(updated);
    syncMenuBar(updated);
    await showToast({ style: Toast.Style.Success, title: "All caught up!" });
  };

  const toggleDemoMode = () => {
    setDemoMode((prev) => {
      const next = !prev;
      if (next) {
        setDisplayPrs(getDemoPRs());
        setDemoSeenMap({});
        setCollapsed({});
      } else {
        setDisplayPrs(undefined);
        revalidate();
      }
      return next;
    });
  };

  const handleToggleFilter = async (type: ActivityItem["type"]) => {
    const updated = { ...eventFilters, [type]: !eventFilters[type] };
    setEventFilters(updated);
    await saveEventFilters(updated);
    // Filters change the unread COUNT, not just the view — hiding the only visible activity type
    // empties the list immediately, so the badge must follow or it keeps a number the list no
    // longer shows. Fire-and-forget, matching the mark-as-read handlers.
    void refreshMenuBar(toMenuBarPrs(computePrsWithUnseen(displayPrs ?? [], seenMap, updated, compiledFilter)));
  };

  const handleSelectFilter = async (id: string | undefined) => {
    await saveActiveFilterId(id);
    setActiveFilterId(id);
  };

  // Shared by both Create and Edit: PrFilterForm already persisted the record itself, so this
  // only needs to mirror it into local state and make it the active selection.
  const handleFilterSaved = async (saved: PrFilter) => {
    setPrFilters((prev) => {
      const exists = prev.some((f) => f.id === saved.id);
      return exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved];
    });
    await handleSelectFilter(saved.id);
  };

  const handleDeleteFilter = async () => {
    const target = prFilters.find((f) => f.id === activeFilterId);
    if (!target) return;
    const confirmed = await confirmAlert({
      title: `Delete "${target.name}"?`,
      message: "This can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const next = prFilters.filter((f) => f.id !== target.id);
    setPrFilters(next);
    await savePrFilters(next);
    await handleSelectFilter(undefined);
    await showToast({ style: Toast.Style.Success, title: "Filter deleted" });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter PR updates…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="PR Filter"
          value={activeFilterId ?? ""}
          onChange={(id) => handleSelectFilter(id === "" ? undefined : id)}
        >
          <List.Dropdown.Item title="All Pull Requests" value="" />
          {prFilters.map((f) => (
            <List.Dropdown.Item key={f.id} title={f.name} value={f.id} />
          ))}
        </List.Dropdown>
      }
    >
      {/* Render whenever there is nothing to list — including mid-refresh and in demo mode.
          Gating this on `!isLoading` left a completely blank window after "Mark All as Caught
          Up" (which triggers a revalidate), and gating on `!demoMode` did the same once every
          demo PR was marked read. A List with no children and no EmptyView renders empty. */}
      {prsWithUnseen.length === 0 && (
        <List.EmptyView
          // A failed fetch with no cached data must NOT claim "All caught up!" — the toast that
          // reported the failure disappears, and the user is then left with a screen asserting
          // something the extension does not actually know.
          icon={isLoading ? Icon.ArrowClockwise : fetchFailed ? Icon.Warning : Icon.Checkmark}
          title={isLoading ? "Checking for updates…" : fetchFailed ? "Couldn’t reach GitHub" : "All caught up!"}
          description={
            isLoading
              ? "Looking for new pull request activity."
              : fetchFailed
                ? `${error?.message ?? "The last refresh failed."} Refresh to try again.`
                : allFiltersOff
                  ? "Every event type is hidden. Turn one back on in Event Filters to see activity."
                  : prFilterExcludedEverything
                    ? `No unread activity matches "${activeFilter?.name}". Switch filters, or Refresh for a deeper scan.`
                    : demoMode
                      ? "No unread activity in the demo data. Exit demo mode to see your real pull requests."
                      : "No unread pull request activity. Refresh to check again."
          }
          actions={
            <ActionPanel>
              {/* Refresh is primary: "all caught up" and "the fetch failed" look identical here,
                  so the first thing a user needs is a way to re-check. */}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <FilterSubmenu filters={eventFilters} onToggle={handleToggleFilter} />
              <PrFiltersSubmenu
                activeFilter={activeFilter}
                onSaved={handleFilterSaved}
                onDeleted={handleDeleteFilter}
              />
              <Action
                title={demoMode ? "Exit Demo Mode" : "Demo Mode"}
                icon={Icon.Wand}
                shortcut={{
                  modifiers: ["cmd", "opt", "ctrl", "shift"],
                  key: "d",
                }}
                onAction={toggleDemoMode}
              />
            </ActionPanel>
          }
        />
      )}

      {prsWithUnseen.map(({ pr, unseen }) => {
        const key = prKey(pr);
        const isCollapsed = !!collapsed[key];
        const repoShort = pr.repo.split("/").pop() ?? pr.repo;

        return (
          <List.Section
            key={key}
            title={`#${pr.number} — ${pr.title}`}
            subtitle={`${repoShort} · ${unseen.length} update${unseen.length !== 1 ? "s" : ""} · by ${pr.user.login}`}
          >
            <List.Item
              key={`toggle-${key}`}
              icon={{
                source: isCollapsed ? Icon.ChevronRight : Icon.ChevronDown,
                tintColor: Color.SecondaryText,
              }}
              title={isCollapsed ? `Show ${unseen.length} update${unseen.length !== 1 ? "s" : ""}…` : "Hide updates"}
              accessories={[
                ...(isCollapsed ? unseenSummaryAccessories(unseen, pr) : []),
                { text: formatTimeAgo(unseen[0]?.date ?? pr.updated_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isCollapsed ? "Expand" : "Collapse"}
                    icon={isCollapsed ? Icon.ChevronDown : Icon.ChevronRight}
                    onAction={() => toggleCollapse(pr)}
                  />
                  <Action.Push title="View PR Summary" icon={Icon.List} target={<PRSummaryDetail pr={pr} />} />
                  <Action.OpenInBrowser title="Open PR on GitHub" url={pr.html_url} />
                  <Action
                    // "as" is a preposition — AP, Chicago, and Apple's HIG all lowercase short
                    // prepositions in Title Case ("Save as…"). The linter wants "As"; we don't.
                    // eslint-disable-next-line @raycast/prefer-title-case -- intentional lowercase preposition
                    title="Mark PR as Caught Up"
                    icon={Icon.Checkmark}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={() => handleMarkPRSeen(pr)}
                  />
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case -- intentional lowercase preposition
                    title="Mark All as Caught Up"
                    icon={Icon.CheckCircle}
                    // Intentional custom shortcut — do NOT replace with Keyboard.Shortcut.Common.*
                    // eslint-disable-next-line @raycast/prefer-common-shortcut -- keep cmd+shift+s on purpose
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "s" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                    }}
                    onAction={handleMarkAllSeen}
                  />
                  <Action
                    title={Object.values(collapsed).some(Boolean) ? "Expand All" : "Collapse All"}
                    icon={Icon.AppWindowList}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "e" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                    }}
                    onAction={Object.values(collapsed).some(Boolean) ? expandAll : collapseAll}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action
                    title={demoMode ? "Exit Demo Mode" : "Demo Mode"}
                    icon={Icon.Wand}
                    shortcut={{
                      modifiers: ["cmd", "opt", "ctrl", "shift"],
                      key: "d",
                    }}
                    onAction={toggleDemoMode}
                  />
                  <FilterSubmenu filters={eventFilters} onToggle={handleToggleFilter} />
                  <PrFiltersSubmenu
                    activeFilter={activeFilter}
                    onSaved={handleFilterSaved}
                    onDeleted={handleDeleteFilter}
                  />
                </ActionPanel>
              }
            />

            {!isCollapsed &&
              unseen.map((item) => (
                <ActivityListItem
                  key={item.itemKey}
                  item={item}
                  pr={pr}
                  onMarkItemSeen={() => handleMarkItemSeen(pr, item)}
                  onMarkPRSeen={() => handleMarkPRSeen(pr)}
                  onMarkAllSeen={handleMarkAllSeen}
                  onRefresh={revalidate}
                  demoMode={demoMode}
                  onToggleDemoMode={toggleDemoMode}
                  eventFilters={eventFilters}
                  onToggleFilter={handleToggleFilter}
                  activeFilter={activeFilter}
                  onFilterSaved={handleFilterSaved}
                  onFilterDeleted={handleDeleteFilter}
                />
              ))}
          </List.Section>
        );
      })}
    </List>
  );
}

// ─── Build a compact summary of unseen types for collapsed view ──────────────

function unseenSummaryAccessories(unseen: ActivityItem[], pr: PRWithActivity) {
  const reviews = unseen.filter((i) => i.type === "review").length;
  const codeComments = unseen.filter((i) => i.type === "review_comment" && !isReplyComment(i, pr)).length;
  const replies = unseen.filter((i) => isReplyComment(i, pr)).length;
  const comments = unseen.filter((i) => i.type === "issue_comment").length;
  const labels = unseen.filter((i) => i.type === "label_added" || i.type === "label_removed").length;
  const commits = unseen.filter((i) => i.type === "push").length;
  const forcePushes = unseen.filter((i) => i.type === "force_push").length;
  const prOpened = unseen.filter((i) => i.type === "pr_opened").length;

  const tags: List.Item.Accessory[] = [];
  if (prOpened > 0) {
    tags.push({ tag: { value: "new PR", color: Color.Green } });
  }
  if (reviews > 0) {
    tags.push({
      tag: {
        value: `${reviews} review${reviews !== 1 ? "s" : ""}`,
        color: Color.Green,
      },
    });
  }
  if (codeComments > 0) {
    tags.push({
      tag: {
        value: `${codeComments} code comment${codeComments !== 1 ? "s" : ""}`,
        color: Color.Orange,
      },
    });
  }
  if (replies > 0) {
    tags.push({
      tag: {
        value: `${replies} repl${replies !== 1 ? "ies" : "y"}`,
        color: Color.Blue,
      },
    });
  }
  if (comments > 0) {
    tags.push({
      tag: {
        value: `${comments} comment${comments !== 1 ? "s" : ""}`,
        color: Color.Purple,
      },
    });
  }
  if (commits > 0) {
    tags.push({
      tag: {
        value: `${commits} commit${commits !== 1 ? "s" : ""}`,
        color: Color.Yellow,
      },
    });
  }
  if (forcePushes > 0) {
    tags.push({
      tag: {
        value: `${forcePushes} force push${forcePushes !== 1 ? "es" : ""}`,
        color: Color.Red,
      },
    });
  }
  if (labels > 0) {
    tags.push({
      tag: {
        value: `${labels} label change${labels !== 1 ? "s" : ""}`,
        color: Color.Magenta,
      },
    });
  }
  return tags;
}

// ─── Single activity row ─────────────────────────────────────────────────────

function ActivityListItem({
  item,
  pr,
  onMarkItemSeen,
  onMarkPRSeen,
  onMarkAllSeen,
  onRefresh,
  demoMode,
  onToggleDemoMode,
  eventFilters,
  onToggleFilter,
  activeFilter,
  onFilterSaved,
  onFilterDeleted,
}: {
  item: ActivityItem;
  pr: PRWithActivity;
  onMarkItemSeen: () => void;
  onMarkPRSeen: () => void;
  onMarkAllSeen: () => void;
  onRefresh: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  eventFilters: EventFilters;
  onToggleFilter: (type: ActivityItem["type"]) => void;
  activeFilter: PrFilter | undefined;
  onFilterSaved: (filter: PrFilter) => void;
  onFilterDeleted: () => void;
}) {
  const isReply = isReplyComment(item, pr);
  const isCodeComment = item.type === "review_comment" && !isReply;

  let subtitle: string;
  let icon: { source: Icon; tintColor: Color };

  if (item.type === "review") {
    subtitle = item.reviewState ?? "";
    icon = {
      source: STATE_ICON[item.reviewState ?? ""] ?? Icon.Bubble,
      tintColor: STATE_COLOR[item.reviewState ?? ""] ?? Color.PrimaryText,
    };
  } else if (isReply) {
    subtitle = `replied on ${item.path ?? "code"}`;
    icon = { source: Icon.ArrowRight, tintColor: Color.Blue };
  } else if (isCodeComment) {
    subtitle = item.path ?? "code comment";
    icon = { source: Icon.Pencil, tintColor: Color.Orange };
  } else if (item.type === "label_added") {
    subtitle = `added "${item.labelName}"`;
    icon = { source: Icon.Tag, tintColor: Color.Magenta };
  } else if (item.type === "label_removed") {
    subtitle = `removed "${item.labelName}"`;
    icon = { source: Icon.Tag, tintColor: Color.SecondaryText };
  } else if (item.type === "push") {
    subtitle = item.commitSha?.slice(0, 7) ?? "commit";
    icon = { source: Icon.CodeBlock, tintColor: Color.Yellow };
  } else if (item.type === "force_push") {
    subtitle = "force pushed";
    icon = { source: Icon.Warning, tintColor: Color.Red };
  } else if (item.type === "pr_opened") {
    subtitle = "opened this PR";
    icon = { source: Icon.Plus, tintColor: Color.Green };
  } else {
    subtitle = "comment";
    icon = { source: Icon.Bubble, tintColor: Color.Purple };
  }

  // Timestamp — always show, keep body preview very short to avoid truncation
  const dateStr = item.date || pr.updated_at;
  const timeAgo = dateStr ? formatTimeAgo(dateStr) : "";

  return (
    <List.Item
      icon={icon}
      title={item.user.login}
      subtitle={subtitle}
      accessories={[
        ...(item.body ? [{ text: truncate(item.body, 30) }] : []),
        { tag: { value: timeAgo, color: Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" icon={Icon.Eye} target={<ActivityDetail item={item} pr={pr} />} />
          <Action.OpenInBrowser title="Open on GitHub" url={item.htmlUrl} />
          <Action
            title="Mark This Item as Seen"
            icon={Icon.EyeDropper}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
            onAction={onMarkItemSeen}
          />
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case -- intentional lowercase preposition
            title="Mark Entire PR as Caught Up"
            icon={Icon.Checkmark}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={onMarkPRSeen}
          />
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case -- intentional lowercase preposition
            title="Mark All as Caught Up"
            icon={Icon.CheckCircle}
            // Intentional custom shortcut — do NOT replace with Keyboard.Shortcut.Common.*
            // eslint-disable-next-line @raycast/prefer-common-shortcut -- keep cmd+shift+s on purpose
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "s" },
              Windows: { modifiers: ["ctrl", "shift"], key: "s" },
            }}
            onAction={onMarkAllSeen}
          />
          <Action.Push title="View PR Summary" icon={Icon.List} target={<PRSummaryDetail pr={pr} />} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <Action
            title={demoMode ? "Exit Demo Mode" : "Demo Mode"}
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd", "opt", "ctrl", "shift"], key: "d" }}
            onAction={onToggleDemoMode}
          />
          <FilterSubmenu filters={eventFilters} onToggle={onToggleFilter} />
          <PrFiltersSubmenu activeFilter={activeFilter} onSaved={onFilterSaved} onDeleted={onFilterDeleted} />
        </ActionPanel>
      }
    />
  );
}

// ─── Detail views ────────────────────────────────────────────────────────────

function ActivityDetail({ item, pr }: { item: ActivityItem; pr: PRWithActivity }) {
  const markdown = renderActivityMarkdown(item, pr.reviewComments);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`#${pr.number} — ${item.user.login}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on GitHub" url={item.htmlUrl} />
          <Action.CopyToClipboard title="Copy Comment" content={item.body} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={item.user.login} />
          <Detail.Metadata.Label title="Date" text={item.date ? new Date(item.date).toLocaleString() : "Unknown"} />
          <Detail.Metadata.Label
            title="Type"
            text={
              item.type === "pr_opened"
                ? "PR opened"
                : item.type === "push"
                  ? "commit"
                  : item.type === "force_push"
                    ? "force push"
                    : item.type === "label_added"
                      ? "label added"
                      : item.type === "label_removed"
                        ? "label removed"
                        : isReplyComment(item, pr)
                          ? "reply"
                          : item.type === "review_comment"
                            ? "code comment"
                            : item.type.replace("_", " ")
            }
          />
          {item.reviewState && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={item.reviewState}
                color={STATE_COLOR[item.reviewState] ?? Color.PrimaryText}
              />
            </Detail.Metadata.TagList>
          )}
          {item.path && <Detail.Metadata.Label title="File" text={item.path} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="GitHub" text="Open in browser" target={item.htmlUrl} />
        </Detail.Metadata>
      }
    />
  );
}

function PRSummaryDetail({ pr }: { pr: PRWithActivity }) {
  const { data: seenMap } = usePromise(loadSeen);
  const unseen = getUnseenActivity(pr, seenMap?.[prKey(pr)]);
  const markdown = renderPRSummaryMarkdown(pr, unseen);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`#${pr.number} — ${pr.title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open PR on GitHub" url={pr.html_url} />
        </ActionPanel>
      }
    />
  );
}

// ─── Event filter submenu ─────────────────────────────────────────────────────

function FilterSubmenu({
  filters,
  onToggle,
}: {
  filters: EventFilters;
  onToggle: (type: ActivityItem["type"]) => void;
}) {
  return (
    <ActionPanel.Submenu title="Event Filters" icon={Icon.Filter}>
      {ALL_ACTIVITY_TYPES.map(({ type, label }) => (
        <Action
          key={type}
          title={label}
          icon={filters[type] ? Icon.CheckCircle : Icon.Circle}
          onAction={() => onToggle(type)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

// ─── PR filter submenu & form ────────────────────────────────────────────────

function PrFiltersSubmenu({
  activeFilter,
  onSaved,
  onDeleted,
}: {
  activeFilter: PrFilter | undefined;
  onSaved: (filter: PrFilter) => void | Promise<void>;
  onDeleted: () => void;
}) {
  return (
    <ActionPanel.Submenu title="PR Filters" icon={Icon.Filter}>
      <Action.Push title="Create Filter…" icon={Icon.Plus} target={<PrFilterForm onSaved={onSaved} />} />
      {activeFilter && (
        <Action.Push
          title={`Edit "${activeFilter.name}"…`}
          icon={Icon.Pencil}
          target={<PrFilterForm filter={activeFilter} onSaved={onSaved} />}
        />
      )}
      {activeFilter && (
        <Action
          title={`Delete "${activeFilter.name}"…`}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={onDeleted}
        />
      )}
    </ActionPanel.Submenu>
  );
}

/** Not crypto.randomUUID() — avoids depending on that global's availability in every Raycast
 *  runtime version; a short, cheap, collision-safe-enough id for a locally-stored list. */
function generateFilterId(): string {
  return `pf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function PrFilterForm({ filter, onSaved }: { filter?: PrFilter; onSaved: (filter: PrFilter) => void | Promise<void> }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; query: string }) {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setNameError("Name is required");
      return;
    }
    const now = new Date().toISOString();
    const saved: PrFilter = filter
      ? { ...filter, name: trimmedName, query: values.query, updatedAt: now }
      : { id: generateFilterId(), name: trimmedName, query: values.query, createdAt: now, updatedAt: now };
    const all = await loadPrFilters();
    const next = filter ? all.map((f) => (f.id === saved.id ? saved : f)) : [...all, saved];
    await savePrFilters(next);
    await onSaved(saved);
    await showToast({ style: Toast.Style.Success, title: filter ? "Filter updated" : "Filter created" });
    pop();
  }

  return (
    <Form
      navigationTitle={filter ? "Edit Filter" : "Create Filter"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Filter" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text='GitHub-style qualifiers: assignee:, author:, involves:, review-requested:, label:, draft:true|false. Prefix "-" to exclude, use "@me" for yourself, quote multi-word labels: label:"needs review".' />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Reviews"
        defaultValue={filter?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="query"
        title="Query"
        placeholder="assignee:@me -author:dependabot label:bug draft:false"
        defaultValue={filter?.query}
      />
    </Form>
  );
}

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  const clean = str.replace(/\n/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
