import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { checkOnlineHosts, focusActivity, loadActivities, loadHosts } from "./lib/rex";
import type { RexActivity, RexHost, RexProcessEntry } from "./types";

type Tint = { source: Icon; tintColor: Color };
type Scope = "all" | "online";
type View = "active-idle" | "all-sessions";
type Section = { key: string; title: string; items: RexActivity[] };

const SCOPE_ALL = "scope:all";
const SCOPE_ONLINE = "scope:online";
const HOST_PREFIX = "host:";
const VIEW_ACTIVE_IDLE = "view:active-idle";
const VIEW_ALL_SESSIONS = "view:all-sessions";

// Priority sections, most urgent first. "Other" holds unrecognised states and only appears in All Sessions.
const PRIORITY_TITLES = ["Blocked", "Error", "Working", "Done", "Idle", "Other"];
const BUCKET_IDLE = 4;
const BUCKET_OTHER = 5;

function text(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function formatTime(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
}

function exitCode(activity: RexActivity): number | undefined {
  const code = activity.process?.last_exit?.exit_code;
  return typeof code === "number" ? code : undefined;
}

function foregroundName(entry: RexProcessEntry | null | undefined): string | undefined {
  if (!entry) {
    return undefined;
  }

  return text(entry.name) ?? text(entry.argv0) ?? text(entry.path?.split("/").pop());
}

// Prefer what the program itself reported, then what it is, then the terminal block.
function activityTitle(activity: RexActivity): string {
  return (
    text(activity.status?.title) ??
    text(activity.status?.effective_app) ??
    text(activity.status?.app) ??
    foregroundName(activity.process?.foreground) ??
    text(activity.block_label) ??
    text(activity.session_label) ??
    "Untitled Block"
  );
}

// Rex does not expose a per-activity app icon, so this uses a generic SF Symbol.
// Reported status wins; the last exit code and foreground process are the fallbacks.
function fallbackIcon(activity: RexActivity): Tint {
  const state = (text(activity.status?.state) ?? "").toLowerCase();
  const kind = (text(activity.status?.kind) ?? "").toLowerCase();
  const code = exitCode(activity);

  if (/^(error|failed|failure)$/.test(state) || /fail|error|crash/.test(state) || kind === "error") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  if (/^(done|success|succeeded|complete|completed|finished)$/.test(state)) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }

  if (state === "working" || /run|busy|progress|active/.test(state) || kind === "progress") {
    return { source: Icon.CircleProgress, tintColor: Color.Orange };
  }

  if (state === "blocked") {
    return { source: Icon.Pause, tintColor: Color.Yellow };
  }

  if (code !== undefined) {
    return code === 0
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  if (activity.process?.foreground) {
    return { source: Icon.Terminal, tintColor: Color.PrimaryText };
  }

  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function activityKeywords(activity: RexActivity): string[] {
  const foreground = activity.process?.foreground;

  return [
    activity.session_label,
    activity.window_label,
    activity.block_label,
    activity.creator_name,
    activity.flavor,
    activity.host_id,
    activity.status?.app,
    activity.status?.effective_app,
    activity.status?.kind,
    activity.status?.state,
    activity.status?.title,
    activity.status?.owner?.name,
    foregroundName(foreground),
    foreground?.script,
    foreground?.path,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

// No heading: the list row already shows the title. Markdown is omitted when there is no message,
// so the metadata rows start at the top of the detail pane.
function activityMarkdown(activity: RexActivity): string | undefined {
  return text(activity.status?.msg);
}

function MetadataRows({ activity }: { activity: RexActivity }) {
  const foreground = activity.process?.foreground;
  const code = exitCode(activity);
  const exitError = text(activity.process?.last_exit?.error);
  const kind = text(activity.status?.kind);
  const app = text(activity.status?.app);
  const effectiveApp = text(activity.status?.effective_app);
  const progress = activity.status?.progress;
  const updated = formatTime(activity.status?.updated_at);
  const owner = text(activity.status?.owner?.name) ?? text(activity.owner);
  const ownerPid = activity.status?.owner?.pid;
  const processName = foregroundName(foreground);
  const processPid = foreground?.pid;
  const processPath = text(foreground?.path);
  const processScript = text(foreground?.script);
  const cwd = text(foreground?.cwd);
  const creator = text(activity.creator_name);
  const flavor = text(activity.flavor);

  // The block flavor already identifies creators in its namespace (for example, terminal.shell).
  const showCreator = creator && !(flavor && (flavor === creator || flavor.startsWith(`${creator}.`)));
  const showApp = app && app !== processName && app !== effectiveApp;
  const showEffectiveApp = effectiveApp && effectiveApp !== processName;
  const showOwner = owner && owner !== processName && owner !== app && owner !== effectiveApp;
  const showOwnerPid = typeof ownerPid === "number" && (typeof processPid !== "number" || ownerPid !== processPid);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Session" text={text(activity.session_label) ?? "—"} />
      <List.Item.Detail.Metadata.Label title="Window" text={text(activity.window_label) ?? "—"} />
      <List.Item.Detail.Metadata.Label title="Block" text={text(activity.block_label) ?? "—"} />
      {showCreator && <List.Item.Detail.Metadata.Label title="Creator" text={creator} />}
      {kind && <List.Item.Detail.Metadata.Label title="Kind" text={kind} />}
      {progress != null && <List.Item.Detail.Metadata.Label title="Progress" text={`${progress}%`} />}
      {processName && <List.Item.Detail.Metadata.Label title="Process" text={processName} />}
      {typeof processPid === "number" && (
        <List.Item.Detail.Metadata.Label title="Process ID" text={String(processPid)} />
      )}
      {showEffectiveApp && <List.Item.Detail.Metadata.Label title="Effective App" text={effectiveApp} />}
      {showApp && <List.Item.Detail.Metadata.Label title="App" text={app} />}
      {processPath && <List.Item.Detail.Metadata.Label title="Path" text={processPath} />}
      {processScript && <List.Item.Detail.Metadata.Label title="Script" text={processScript} />}
      {cwd && <List.Item.Detail.Metadata.Label title="Directory" text={cwd} />}
      {code !== undefined && <List.Item.Detail.Metadata.Label title="Last Exit" text={String(code)} />}
      {exitError && <List.Item.Detail.Metadata.Label title="Exit Error" text={exitError} />}
      {showOwner && <List.Item.Detail.Metadata.Label title="Owner" text={owner} />}
      {showOwnerPid && <List.Item.Detail.Metadata.Label title="Owner PID" text={String(ownerPid)} />}
      {updated && <List.Item.Detail.Metadata.Label title="Updated" text={updated} />}
    </List.Item.Detail.Metadata>
  );
}

// Group keys are session_id, so duplicate session labels stay separate; the label is displayed.
function sessionKey(activity: RexActivity): string {
  return text(activity.session_id) ?? "unknown-session";
}

// Idle means no program-status record, or a record that reports `idle`.
function isIdleActivity(activity: RexActivity): boolean {
  const state = (text(activity.status?.state) ?? "").toLowerCase();
  return state === "" || state === "idle";
}

// Only an explicit status record reporting `idle` counts. A process-only row with no status does not.
function hasExplicitIdleStatus(activity: RexActivity): boolean {
  return (text(activity.status?.state) ?? "").toLowerCase() === "idle";
}

// Active/Idle keeps every recognised state, including working and idle rows. Unknown states and
// process-only fallback rows (no status record) stay out; All Sessions shows everything.
function isActiveIdleActivity(activity: RexActivity): boolean {
  if (priorityBucket(activity) === BUCKET_OTHER) {
    return false;
  }
  return !(isIdleActivity(activity) && !hasExplicitIdleStatus(activity));
}

// Priority bucket index into PRIORITY_TITLES. Lower is more urgent.
function priorityBucket(activity: RexActivity): number {
  const state = (text(activity.status?.state) ?? "").toLowerCase();
  const kind = (text(activity.status?.kind) ?? "").toLowerCase();

  if (isIdleActivity(activity)) {
    return BUCKET_IDLE;
  }
  if (state === "blocked") {
    return 0;
  }
  if (/^(error|failed|failure)$/.test(state) || /fail|error|crash/.test(state) || kind === "error") {
    return 1;
  }
  if (state === "working" || /run|busy|progress|active/.test(state) || kind === "progress") {
    return 2;
  }
  if (/^(done|success|succeeded|complete|completed|finished)$/.test(state)) {
    return 3;
  }
  return BUCKET_OTHER;
}

// Within Blocked, permission, question, and auth waits sort above other blocked items.
function blockedSubrank(activity: RexActivity): number {
  const signal = `${text(activity.status?.kind) ?? ""} ${text(activity.status?.state) ?? ""}`.toLowerCase();
  return /permission|question|auth/.test(signal) ? 0 : 1;
}

function updatedAt(activity: RexActivity): number {
  const parsed = Date.parse(text(activity.status?.updated_at) ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Latest updated_at first, then title.
function compareRecent(a: RexActivity, b: RexActivity): number {
  return updatedAt(b) - updatedAt(a) || activityTitle(a).localeCompare(activityTitle(b));
}

// The host key is the RexHost.id that the activity belongs to, or undefined when no listed host matches.
function hostKeyFor(activity: RexActivity, hosts: RexHost[]): string | undefined {
  const hostId = text(activity.host_id);
  if (!hostId) {
    return undefined;
  }
  return hosts.find((host) => host.id === hostId || text(host.host_id) === hostId)?.id;
}

function groupBySession(items: RexActivity[]): Section[] {
  const sections = new Map<string, Section>();
  for (const activity of items) {
    const key = sessionKey(activity);
    const section = sections.get(key) ?? {
      key,
      title: text(activity.session_label) ?? "Unnamed Session",
      items: [],
    };
    section.items.push(activity);
    sections.set(key, section);
  }
  return Array.from(sections.values());
}

// Input must already be in latest-first order; each bucket keeps that order.
function groupByPriority(items: RexActivity[]): Section[] {
  const buckets = PRIORITY_TITLES.map((title, index) => ({
    key: `priority-${index}`,
    title,
    items: [] as RexActivity[],
  }));
  for (const activity of items) {
    buckets[priorityBucket(activity)].items.push(activity);
  }
  // Array.prototype.sort is stable, so latest-first order is kept within each subrank.
  buckets[0].items.sort((a, b) => blockedSubrank(a) - blockedSubrank(b));
  return buckets.filter((bucket) => bucket.items.length > 0);
}

export default function Activity() {
  const [scope, setScope] = useState<Scope>("all");
  const [disabledHostIds, setDisabledHostIds] = useState<Set<string>>(() => new Set());
  const [showIdle, setShowIdle] = useState(true);
  const [view, setView] = useState<View>("active-idle");
  // Off by default: sections are priority buckets. On: sections are sessions.
  const [sessionGrouping, setSessionGrouping] = useState(false);

  const { data, error, isLoading, revalidate } = useCachedPromise(loadActivities, [], {
    keepPreviousData: true,
  });
  const { data: hostsData, error: hostsError } = useCachedPromise(loadHosts, [], { keepPreviousData: true });
  const {
    data: onlineData,
    error: onlineError,
    isLoading: onlineLoading,
    revalidate: revalidateOnline,
  } = useCachedPromise(checkOnlineHosts, [], {
    keepPreviousData: true,
    // Reachability is only probed while Online Hosts is selected.
    execute: scope === "online",
  });

  const activities = data?.activities ?? [];
  const failedSessions = data?.failedSessions ?? [];
  const hosts = hostsData ?? [];
  const onlineIds = new Set(onlineData ?? []);

  const refreshActivity = async () => {
    await Promise.allSettled([revalidate(), ...(scope === "online" ? [revalidateOnline()] : [])]);
  };

  useEffect(() => {
    if (hostsError) {
      showFailureToast(hostsError, { title: "Could Not Load Servers" });
    }
  }, [hostsError]);

  // Session load failures do not block healthy sessions, so report them apart from the list.
  useEffect(() => {
    if (failedSessions.length === 0) {
      return;
    }

    showToast({
      style: Toast.Style.Failure,
      title:
        failedSessions.length === 1
          ? `Could Not Load ${failedSessions[0].session_label}`
          : `Could Not Load ${failedSessions.length} Sessions`,
      message: failedSessions.map((failure) => `${failure.session_label}: ${failure.message}`).join("\n"),
    });
  }, [failedSessions]);

  const goToPane = async (activity: RexActivity) => {
    try {
      await focusActivity(activity);
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (focusError) {
      await showFailureToast(focusError, { title: "Could Not Go to Pane" });
    }
  };

  const toggleHost = (hostId: string) => {
    setDisabledHostIds((previous) => {
      const next = new Set(previous);
      if (next.has(hostId)) {
        next.delete(hostId);
      } else {
        next.add(hostId);
      }
      return next;
    });
  };

  // Scope and server toggles combine: an activity must pass both to show.
  // Unlisted hosts show under All Hosts and stay hidden under Online Hosts.
  // Active/Idle keeps recognised states from every session; All Sessions keeps everything.
  const visibleActivities = activities
    .filter((activity) => {
      if (view === "active-idle" && !isActiveIdleActivity(activity)) {
        return false;
      }
      const hostKey = hostKeyFor(activity, hosts);
      if (scope === "online" && (hostKey === undefined || !onlineIds.has(hostKey))) {
        return false;
      }
      if (hostKey !== undefined && disabledHostIds.has(hostKey)) {
        return false;
      }
      return showIdle || !isIdleActivity(activity);
    })
    .sort(compareRecent);

  const sections = sessionGrouping ? groupBySession(visibleActivities) : groupByPriority(visibleActivities);

  // List.Dropdown is single-select. Its displayed value is the current view; host scope and
  // server items are handled in onChange and leave the displayed view unchanged.
  const handleFilterChange = (value: string) => {
    if (value.startsWith(HOST_PREFIX)) {
      toggleHost(value.slice(HOST_PREFIX.length));
      return;
    }
    if (value === VIEW_ACTIVE_IDLE || value === VIEW_ALL_SESSIONS) {
      setView(value === VIEW_ALL_SESSIONS ? "all-sessions" : "active-idle");
      return;
    }
    if (value === SCOPE_ALL || value === SCOPE_ONLINE) {
      setScope(value === SCOPE_ONLINE ? "online" : "all");
    }
  };

  const viewIcon = (selected: boolean): Tint =>
    selected ? { source: Icon.Clock, tintColor: Color.Green } : { source: Icon.Circle, tintColor: Color.SecondaryText };

  const filterDropdown = (
    <List.Dropdown
      tooltip="Filter Activity"
      value={view === "all-sessions" ? VIEW_ALL_SESSIONS : VIEW_ACTIVE_IDLE}
      onChange={handleFilterChange}
    >
      <List.Dropdown.Section title="View">
        <List.Dropdown.Item title="Active/Idle" value={VIEW_ACTIVE_IDLE} icon={viewIcon(view === "active-idle")} />
        <List.Dropdown.Item title="All Sessions" value={VIEW_ALL_SESSIONS} icon={viewIcon(view === "all-sessions")} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Hosts">
        <List.Dropdown.Item title="All Hosts" value={SCOPE_ALL} icon={Icon.Layers} />
        <List.Dropdown.Item title="Online Hosts" value={SCOPE_ONLINE} icon={Icon.Wifi} />
      </List.Dropdown.Section>
      {hosts.length > 0 && (
        <List.Dropdown.Section title="Servers">
          {hosts.map((host) => {
            const enabled = !disabledHostIds.has(host.id);
            return (
              <List.Dropdown.Item
                key={host.id}
                title={host.label}
                value={`${HOST_PREFIX}${host.id}`}
                icon={
                  enabled
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.SecondaryText }
                }
              />
            );
          })}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );

  const viewActions = (
    <ActionPanel.Section title="View">
      <Action
        title="Show Idle Sessions"
        icon={showIdle ? Icon.Checkmark : Icon.Circle}
        onAction={() => setShowIdle((value) => !value)}
      />
      <Action
        title="Group by Session"
        icon={sessionGrouping ? Icon.Checkmark : Icon.Circle}
        onAction={() => setSessionGrouping((value) => !value)}
      />
    </ActionPanel.Section>
  );

  const allServersOff = hosts.length > 0 && hosts.every((host) => disabledHostIds.has(host.id));
  const loading = isLoading || (scope === "online" && onlineLoading);
  const isEmpty = !isLoading && !error && activities.length === 0;

  const filteredEmptyTitle = allServersOff
    ? "No Servers Selected"
    : scope === "online" && onlineIds.size === 0
      ? "No Online Hosts"
      : view === "active-idle" && !activities.some(isActiveIdleActivity)
        ? "No Active or Idle Sessions"
        : !showIdle && activities.some(isIdleActivity)
          ? "Only Idle Sessions Hidden"
          : "No Matching Activity";
  const filteredEmptyDescription = allServersOff
    ? "Turn a server back on from the Servers section of the filter."
    : scope === "online" && onlineIds.size === 0
      ? "None of your servers responded to the check."
      : view === "active-idle" && !activities.some(isActiveIdleActivity)
        ? "No session is working or idle right now. Choose All Sessions in the filter to see everything."
        : !showIdle && activities.some(isIdleActivity)
          ? "Turn on Show Idle Sessions to see them."
          : "Try All Hosts or check the server filters.";

  return (
    <List
      isLoading={loading}
      isShowingDetail={visibleActivities.length > 0}
      searchBarPlaceholder={`Filter ${view === "all-sessions" ? "All Sessions" : "Active/Idle"} by block, session, process, or state`}
      searchBarAccessory={filterDropdown}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Rex Activity"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refreshActivity} />
            </ActionPanel>
          }
        />
      ) : isEmpty ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Rex Activity"
          description="Programs running in Rex terminal blocks will show up here."
          actions={
            <ActionPanel>
              <Action title="Refresh Activity" icon={Icon.ArrowClockwise} onAction={refreshActivity} />
              {viewActions}
            </ActionPanel>
          }
        />
      ) : scope === "online" && onlineError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Check Online Hosts"
          description={onlineError.message}
          actions={
            <ActionPanel>
              <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={revalidateOnline} />
              <Action title="Show All Hosts" icon={Icon.Layers} onAction={() => setScope("all")} />
            </ActionPanel>
          }
        />
      ) : visibleActivities.length === 0 && !loading ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title={filteredEmptyTitle}
          description={filteredEmptyDescription}
          actions={
            <ActionPanel>
              {allServersOff && (
                <Action title="Show All Servers" icon={Icon.Layers} onAction={() => setDisabledHostIds(new Set())} />
              )}
              <Action title="Refresh Activity" icon={Icon.ArrowClockwise} onAction={refreshActivity} />
              {viewActions}
            </ActionPanel>
          }
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.key} title={section.title}>
            {section.items.map((activity) => (
              <List.Item
                key={activity.id}
                title={activityTitle(activity)}
                subtitle={text(activity.window_label)}
                keywords={activityKeywords(activity)}
                icon={fallbackIcon(activity)}
                accessories={[
                  ...(text(activity.status?.state) ? [{ tag: text(activity.status?.state)! }] : []),
                  // Priority sections don't name the session, so show it on each row.
                  ...(!sessionGrouping && text(activity.session_label)
                    ? [{ text: text(activity.session_label)! }]
                    : []),
                ]}
                detail={
                  <List.Item.Detail
                    markdown={activityMarkdown(activity)}
                    metadata={<MetadataRows activity={activity} />}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Go to Pane" icon={Icon.ArrowRight} onAction={() => goToPane(activity)} />
                    <ActionPanel.Section>
                      <Action
                        title="Refresh Activity"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={refreshActivity}
                      />
                      <Action.CopyToClipboard title="Copy Block ID" content={activity.block_id} />
                      {text(activity.host_id) && (
                        <Action.CopyToClipboard title="Copy Host ID" content={text(activity.host_id)!} />
                      )}
                    </ActionPanel.Section>
                    {viewActions}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
