import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  environment,
  showToast,
  Toast,
  trash,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import {
  getSessionPreview,
  scanAllSessions,
  SessionMeta,
} from "./lib/sessions";
import {
  createRaycastCache,
  createRaycastSessionCache,
} from "./lib/raycastCache";
import {
  loadConductorSessionTitleMap,
  loadConductorWorkspaceMap,
  openInConductorForCwd,
} from "./lib/conductor";
import {
  DesktopSessionInfo,
  loadDesktopSessionIndex,
} from "./lib/desktopSessions";
import {
  experimentalOpenSessionTarget,
  focusClaudeDesktopApp,
  resolveDesktopResumeAction,
} from "./lib/desktopDeepLink";
import { computeSessionStatus } from "./lib/sessionStatus";
import { buildDemoDataset } from "./lib/demoData";
import {
  DATE_BUCKET_ORDER,
  dateBucket,
  deriveProjectRoot,
  deriveWorktreeOrCityLabel,
  humanFileSize,
  isConductorCwd,
  prettyProjectName,
  relativeTime,
  stableHashIndex,
} from "./lib/format";

// A curated set of visually distinct Raycast colors for project row-icon
// tints — `PROJECT_COLOR_PALETTE[stableHashIndex(rootKey, ...)]`, so the same
// project always gets the same color across renders/launches. Deliberately
// excludes:
//   - SecondaryText/PrimaryText: reserved for the archived/muted look.
//   - Orange and Purple: reserved exclusively for the "Claude"/"Conductor"
//     surface tags (see SURFACE_TAG below) — a project happening to hash to
//     the same color as a surface tag made rows ambiguous at a glance
//     (e.g. an orange project icon next to an orange "Claude" tag looked
//     like they were the same signal). CLI's tag stays Blue and shares the
//     palette with projects — Raycast only has 7 non-gray built-in colors
//     total (`Color.Brown` is deprecated and explicitly discouraged), so
//     reserving a distinct one for CLI too would leave just 4 for projects;
//     the "CLI" tag is labeled text either way, so a shared hue isn't
//     ambiguous the way an *unlabeled* icon color would be.
const PROJECT_COLOR_PALETTE: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Red,
  Color.Yellow,
];

function projectColor(rootKey: string): Color {
  return PROJECT_COLOR_PALETTE[
    stableHashIndex(rootKey, PROJECT_COLOR_PALETTE.length)
  ];
}

const RENAME_PREFIX = "rename:";
const sessionCache = createRaycastSessionCache();
const desktopSessionCache = createRaycastCache("claude-desktop-sessions");

/**
 * Precedence for CLI/Desktop sessions: rename > custom-title > ai-title >
 * desktop title > first prompt. For Conductor-cwd sessions specifically,
 * Conductor's own `sessions.title` (joined by claude_session_id — see
 * `loadConductorSessionTitleMap`) slots in right after rename, since it's
 * per-conversation like the other sources (not a workspace/branch-level
 * label, which can drift from the session's own title over time).
 */
function resolveTitle(
  session: SessionMeta,
  renameMap: Record<string, string>,
  desktopIndex: Record<string, DesktopSessionInfo>,
  conductorTitles: Record<string, string>,
): string {
  const conductorTitle = isConductorCwd(session.cwd)
    ? conductorTitles[session.sessionId]
    : undefined;
  return (
    renameMap[session.sessionId] ??
    conductorTitle ??
    session.customTitle ??
    session.aiTitle ??
    desktopIndex[session.sessionId]?.title ??
    session.firstPromptTitle
  );
}

type EntrypointKind = "claude-desktop" | "conductor" | "cli";

/**
 * Where a session "lives" — Conductor takes priority (cwd under
 * `~/conductor/workspaces/`), then Claude Desktop (either it was launched
 * with that entrypoint, or — more reliably — it has a desktop `local_*.json`
 * record at all, since a CLI-entrypoint session can still have been imported
 * into Desktop afterwards), else plain CLI.
 */
function entrypointKind(
  session: SessionMeta,
  desktopIndex: Record<string, DesktopSessionInfo>,
): EntrypointKind {
  if (isConductorCwd(session.cwd)) return "conductor";
  if (
    session.entrypoint === "claude-desktop" ||
    desktopIndex[session.sessionId]
  )
    return "claude-desktop";
  return "cli";
}

/** Icon shape by entrypoint/context — color comes from the project instead, see `projectColor`. */
function entrypointIconSource(kind: EntrypointKind): Icon {
  switch (kind) {
    case "claude-desktop":
      return Icon.Desktop;
    case "conductor":
      return Icon.Layers;
    case "cli":
      return Icon.Terminal;
  }
}

/** Row accessory labeling *where* a session lives — replaces the old worktree/slug tag. */
const SURFACE_TAG: Record<
  EntrypointKind,
  { value: string; color: Color; icon: Icon }
> = {
  "claude-desktop": {
    value: "Claude",
    color: Color.Orange,
    icon: Icon.Desktop,
  },
  conductor: { value: "Conductor", color: Color.Purple, icon: Icon.Layers },
  cli: { value: "CLI", color: Color.Blue, icon: Icon.Terminal },
};

type StatusFilter = "active" | "all" | "archived";

const STATUS_FILTER_CYCLE: Record<StatusFilter, StatusFilter> = {
  active: "all",
  all: "archived",
  archived: "active",
};

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  active: "Active",
  all: "All",
  archived: "Archived",
};

type GroupBy = "project" | "date";

const GROUP_BY_CYCLE: Record<GroupBy, GroupBy> = {
  project: "date",
  date: "project",
};

const GROUP_BY_LABEL: Record<GroupBy, string> = {
  project: "Project",
  date: "Date",
};

interface RenderedSection {
  key: string;
  title: string;
  items: SessionMeta[];
}

/** Shown whenever an effectful action is blocked because demo mode is on. */
async function showDemoDataToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Demo data",
    message:
      "This is fake data for screenshots — actions are disabled while it's on.",
  });
}

/**
 * A stand-in for an effectful action (one that would touch the filesystem or
 * open another app) while demo mode is on — same title/icon/shortcut, but it
 * just explains itself instead of doing anything. Used for the actions that
 * can't be guarded with a simple "check first, then proceed" onAction
 * (Action.Open/Action.CopyToClipboard/Action.ShowInFinder perform their
 * effect as soon as they're invoked, with no cancelable pre-hook).
 */
function demoBlockedAction(
  title: string,
  icon: Icon,
  shortcut?: Keyboard.Shortcut,
  style?: Action.Style,
) {
  return (
    <Action
      title={title}
      icon={icon}
      shortcut={shortcut}
      style={style}
      onAction={() => void showDemoDataToast()}
    />
  );
}

/**
 * Wraps `value` in single quotes for safe interpolation into a POSIX shell
 * command line (used by the "Copy Resume Command" action below). A `cwd` or
 * session id containing a space, `$`, backtick, or similar could otherwise
 * change what the copied command actually runs. Any embedded single quote is
 * escaped with the standard `'\''` (close, escaped literal quote, reopen)
 * technique.
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadRenameMap(): Promise<Record<string, string>> {
  const items = await LocalStorage.allItems<Record<string, string>>();
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith(RENAME_PREFIX)) {
      map[key.slice(RENAME_PREFIX.length)] = value;
    }
  }
  return map;
}

export default function ListSessions() {
  const {
    data: sessions,
    isLoading,
    revalidate,
  } = useCachedPromise(() => scanAllSessions(sessionCache), [], {
    keepPreviousData: true,
  });
  const { data: renameMap, revalidate: revalidateRenames } = useCachedPromise(
    loadRenameMap,
    [],
    { initialData: {} },
  );
  const { data: desktopIndex } = useCachedPromise(
    () => loadDesktopSessionIndex(desktopSessionCache),
    [],
    { initialData: {} },
  );
  const { data: conductorWorkspaceMap } = useCachedPromise(
    loadConductorWorkspaceMap,
    [],
    { initialData: {} },
  );
  const { data: conductorTitleMap } = useCachedPromise(
    loadConductorSessionTitleMap,
    [],
    { initialData: {} },
  );
  const { value: statusFilterValue, setValue: setStatusFilter } =
    useLocalStorage<StatusFilter>("statusFilter", "active");
  const statusFilter = statusFilterValue ?? "active";
  const { value: groupByValue, setValue: setGroupBy } =
    useLocalStorage<GroupBy>("groupBy", "project");
  const groupBy = groupByValue ?? "project";
  const { value: demoModeValue, setValue: setDemoModeValue } =
    useLocalStorage<boolean>("demoMode", false);
  // `environment.isDevelopment` is checked here too, not just around the
  // toggle action — so a store build never shows demo data even if this
  // LocalStorage flag was somehow left on from an earlier dev session.
  const isDemoMode = environment.isDevelopment && (demoModeValue ?? false);
  const demoDataset = useMemo(() => buildDemoDataset(), []);

  function guardDemo(): boolean {
    if (isDemoMode) {
      void showDemoDataToast();
      return true;
    }
    return false;
  }

  const [searchText, setSearchText] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  // Keyed by file path, not sessionId — a session id is unique after
  // dedupeBySessionId() runs, but the file path is unique by construction and
  // is what List needs as a stable, always-unique item id/key.
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(
    undefined,
  );

  // Every downstream computation (status filtering, project grouping,
  // search, row rendering) reads only from these four — swapping them for
  // the fake dataset is enough to make every UI path exercise demo data
  // without special-casing any of the logic below.
  const allSessions = isDemoMode ? demoDataset.sessions : (sessions ?? []);
  const renames = renameMap ?? {};
  const desktopSessions = isDemoMode
    ? demoDataset.desktopIndex
    : (desktopIndex ?? {});
  const conductorWorkspaces = isDemoMode
    ? demoDataset.conductorWorkspaces
    : (conductorWorkspaceMap ?? {});
  const conductorTitles = isDemoMode
    ? demoDataset.conductorTitles
    : (conductorTitleMap ?? {});

  // Applied first, ahead of the project dropdown and search, so the project
  // list/counts and search results both reflect "what's actually visible in
  // the current Active/All/Archived mode" rather than always every session.
  const statusFiltered = useMemo(() => {
    if (statusFilter === "all") return allSessions;
    return allSessions.filter((session) => {
      const status = computeSessionStatus(
        session,
        desktopSessions,
        conductorWorkspaces,
      );
      return status === statusFilter;
    });
  }, [allSessions, statusFilter, desktopSessions, conductorWorkspaces]);

  const projects = useMemo(() => {
    const seen = new Map<string, { label: string; count: number }>();
    for (const session of statusFiltered) {
      const root = deriveProjectRoot(session.cwd);
      const existing = seen.get(root.key);
      if (existing) {
        existing.count += 1;
      } else {
        seen.set(root.key, { label: root.label, count: 1 });
      }
    }
    return Array.from(seen.entries())
      .map(([key, { label, count }]) => ({ key, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [statusFiltered]);

  const filtered = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return statusFiltered.filter((session) => {
      if (
        selectedProject !== "all" &&
        deriveProjectRoot(session.cwd).key !== selectedProject
      )
        return false;
      if (!needle) return true;
      const title = resolveTitle(
        session,
        renames,
        desktopSessions,
        conductorTitles,
      ).toLowerCase();
      return (
        title.includes(needle) ||
        (session.slug ?? "").toLowerCase().includes(needle) ||
        (session.gitBranch ?? "").toLowerCase().includes(needle) ||
        deriveProjectRoot(session.cwd).label.toLowerCase().includes(needle) ||
        prettyProjectName(session.cwd).toLowerCase().includes(needle)
      );
    });
  }, [
    statusFiltered,
    searchText,
    selectedProject,
    renames,
    desktopSessions,
    conductorTitles,
  ]);

  // Default grouping: one section per root project (same buckets as the
  // project dropdown), ordered alphabetically by project name, with sessions
  // inside each section sorted newest-first. When a project is selected in
  // the dropdown, `filtered` already only has that project's sessions, so
  // this naturally collapses to a single section.
  const projectSections = useMemo((): RenderedSection[] => {
    const buckets = new Map<string, { label: string; items: SessionMeta[] }>();
    for (const session of filtered) {
      const root = deriveProjectRoot(session.cwd);
      let bucket = buckets.get(root.key);
      if (!bucket) {
        bucket = { label: root.label, items: [] };
        buckets.set(root.key, bucket);
      }
      bucket.items.push(session);
    }
    return Array.from(buckets.entries())
      .map(([key, { label, items }]) => ({
        key,
        title: label,
        items: [...items].sort((a, b) => b.mtime.getTime() - a.mtime.getTime()),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [filtered]);

  // Kept alongside the (now default) project grouping so "Group by" can
  // toggle back to it — this is the original Today/Yesterday/.../Older
  // grouping.
  const dateSections = useMemo((): RenderedSection[] => {
    const buckets = new Map<string, SessionMeta[]>();
    for (const bucket of DATE_BUCKET_ORDER) buckets.set(bucket, []);
    for (const session of filtered) {
      const bucket = dateBucket(session.mtime);
      buckets.get(bucket)?.push(session);
    }
    return DATE_BUCKET_ORDER.map((bucket) => ({
      key: bucket,
      title: bucket,
      items: buckets.get(bucket) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [filtered]);

  const sections = groupBy === "date" ? dateSections : projectSections;

  const selectedSession = allSessions.find(
    (session) => session.filePath === selectedFilePath,
  );

  // Demo sessions' filePath doesn't exist on disk, so never fire the real
  // (file-reading) preview fetch for them — buildMarkdown pulls straight from
  // demoDataset.previewMessages instead when isDemoMode is on.
  const { data: preview, isLoading: isPreviewLoading } = useCachedPromise(
    async (filePath: string, size: number) => getSessionPreview(filePath, size),
    [selectedSession?.filePath ?? "", selectedSession?.size ?? 0],
    { execute: isShowingDetail && !!selectedSession && !isDemoMode },
  );

  const { push } = useNavigation();

  async function handleRename(session: SessionMeta, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await LocalStorage.setItem(`${RENAME_PREFIX}${session.sessionId}`, trimmed);
    await revalidateRenames();
    await showToast({ style: Toast.Style.Success, title: "Session renamed" });
  }

  async function handleDelete(session: SessionMeta) {
    const confirmed = await confirmAlert({
      title: "Delete session?",
      message: `"${resolveTitle(session, renames, desktopSessions, conductorTitles)}" will be moved to the Trash.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(session.filePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Session moved to Trash",
      });
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleOpenInConductor(session: SessionMeta) {
    try {
      await openInConductorForCwd(session.cwd);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Conductor",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleFocusClaudeDesktop() {
    try {
      await focusClaudeDesktopApp();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Claude Desktop",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function buildMarkdown(session: SessionMeta): string {
    const parts = [`### First prompt\n\n${session.firstPromptFull}`];
    // Only the currently selected item's detail is ever visible, and `preview`
    // is fetched for that item alone — gate on it so other items never show
    // a stale/mismatched preview.
    if (isShowingDetail && session.filePath === selectedFilePath) {
      const messages = isDemoMode
        ? (demoDataset.previewMessages[session.sessionId] ?? [])
        : preview;
      if (!isDemoMode && isPreviewLoading && !preview) {
        parts.push("\n\n---\n\n_Loading conversation preview…_");
      } else if (messages && messages.length > 0) {
        parts.push("\n\n---\n\n### Recent messages\n");
        for (const message of messages) {
          const label = message.role === "user" ? "**You**" : "**Assistant**";
          parts.push(`${label}: ${message.text}\n`);
        }
      }
    }
    return parts.join("\n");
  }

  const navigationTitleParts: string[] = [];
  if (statusFilter !== "active")
    navigationTitleParts.push(STATUS_FILTER_LABEL[statusFilter]);
  if (isDemoMode) navigationTitleParts.push("Demo");
  const navigationTitle =
    navigationTitleParts.length > 0
      ? `Claude Code Sessions — ${navigationTitleParts.join(" — ")}`
      : undefined;

  return (
    <List
      isLoading={isDemoMode ? false : isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={navigationTitle}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Search sessions by title, slug, or branch…"
      onSelectionChange={(id) => setSelectedFilePath(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by project"
          value={selectedProject}
          onChange={setSelectedProject}
        >
          <List.Dropdown.Item title="All Projects" value="all" />
          <List.Dropdown.Section title="Projects">
            {projects.map((project) => (
              <List.Dropdown.Item
                key={project.key}
                title={`${project.label} (${project.count})`}
                value={project.key}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sections.length === 0 && (isDemoMode || !isLoading) ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No sessions found"
          description="Try a different search or project filter."
        />
      ) : (
        sections.map(({ key, title: sectionTitle, items }) => (
          <List.Section
            key={key}
            title={sectionTitle}
            subtitle={`${items.length}`}
          >
            {items.map((session) => {
              const kind = entrypointKind(session, desktopSessions);
              const status = computeSessionStatus(
                session,
                desktopSessions,
                conductorWorkspaces,
              );
              const archived = status === "archived";
              const rootKey = deriveProjectRoot(session.cwd).key;
              const icon = archived
                ? { source: Icon.Circle, tintColor: Color.SecondaryText }
                : {
                    source: entrypointIconSource(kind),
                    tintColor: projectColor(rootKey),
                  };
              const title = resolveTitle(
                session,
                renames,
                desktopSessions,
                conductorTitles,
              );
              const isConductor = kind === "conductor";
              const surfaceTag = SURFACE_TAG[kind];
              const desktopResumeAction = resolveDesktopResumeAction(
                session.sessionId,
                desktopSessions[session.sessionId],
              );
              const experimentalTarget = experimentalOpenSessionTarget(
                desktopSessions[session.sessionId],
              );
              // Only ever visible under "All" (Active/Archived filter it
              // out). "CLI" is no longer needed here — the surface tag
              // below already says "CLI" — this just adds "Scheduled" for
              // desktop-tracked scheduled-task runs that aren't archived.
              const statusTag:
                { tag: { value: string; color: Color } } | undefined = archived
                ? { tag: { value: "Archived", color: Color.SecondaryText } }
                : status === "other" && desktopSessions[session.sessionId]
                  ? { tag: { value: "Scheduled", color: Color.SecondaryText } }
                  : undefined;

              return (
                <List.Item
                  key={session.filePath}
                  id={session.filePath}
                  icon={icon}
                  title={title}
                  accessories={[
                    ...(statusTag ? [statusTag] : []),
                    {
                      tag: { value: surfaceTag.value, color: surfaceTag.color },
                      icon: surfaceTag.icon,
                      tooltip: `Lives in ${surfaceTag.value}`,
                    },
                    { text: relativeTime(session.mtime) },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={buildMarkdown(session)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Project"
                            text={deriveProjectRoot(session.cwd).label}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Worktree"
                            text={deriveWorktreeOrCityLabel(session.cwd) ?? "—"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Branch"
                            text={session.gitBranch ?? "—"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Slug"
                            text={session.slug ?? "—"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Messages"
                            text={String(session.messageCount)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Created"
                            text={formatDateTime(session.createdAt)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Last activity"
                            text={formatDateTime(session.mtime)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Size on disk"
                            text={humanFileSize(session.size)}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Session ID"
                            text={session.sessionId}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        {isConductor ? (
                          <Action
                            title="Open in Conductor"
                            icon={Icon.Layers}
                            onAction={() => {
                              if (guardDemo()) return;
                              handleOpenInConductor(session);
                            }}
                          />
                        ) : (
                          /* Default/Enter action: deterministic, side-effect-free —
                             just focuses Claude Desktop. Importing (which keeps
                             creating untitled "General coding session" wrappers for
                             sessions Desktop already has under a different local id)
                             is a deliberate, clearly-labeled secondary action instead. */
                          <Action
                            title="Open Claude Desktop"
                            icon={Icon.Desktop}
                            onAction={() => {
                              if (guardDemo()) return;
                              handleFocusClaudeDesktop();
                            }}
                          />
                        )}
                        <Action
                          title={
                            isShowingDetail ? "Hide Detail" : "Show Detail"
                          }
                          icon={Icon.Sidebar}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => setIsShowingDetail((value) => !value)}
                        />
                        <Action
                          title={`Group by: ${GROUP_BY_LABEL[GROUP_BY_CYCLE[groupBy]]}`}
                          icon={Icon.AppWindowGrid2x2}
                          shortcut={{ modifiers: ["cmd"], key: "g" }}
                          onAction={() => setGroupBy(GROUP_BY_CYCLE[groupBy])}
                        />
                        {!isConductor &&
                          (isDemoMode ? (
                            demoBlockedAction(
                              desktopResumeAction.title,
                              Icon.Tray,
                              {
                                modifiers: ["cmd", "shift"],
                                key: "i",
                              },
                            )
                          ) : (
                            <Action.Open
                              title={desktopResumeAction.title}
                              target={desktopResumeAction.target}
                              icon={Icon.Tray}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "i",
                              }}
                            />
                          ))}
                        {!isConductor &&
                          experimentalTarget &&
                          (isDemoMode ? (
                            demoBlockedAction(
                              "Open Session in Claude Desktop (Experimental)",
                              Icon.Bolt,
                              { modifiers: ["cmd", "shift"], key: "e" },
                            )
                          ) : (
                            <Action.Open
                              title="Open Session in Claude Desktop (Experimental)"
                              target={experimentalTarget}
                              icon={Icon.Bolt}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "e",
                              }}
                            />
                          ))}
                        {isDemoMode ? (
                          demoBlockedAction(
                            "Copy Resume Command",
                            Icon.CopyClipboard,
                            Keyboard.Shortcut.Common.Copy,
                          )
                        ) : (
                          <Action.CopyToClipboard
                            title="Copy Resume Command"
                            content={`cd ${shellQuote(session.cwd)} && claude --resume ${shellQuote(session.sessionId)}`}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                          />
                        )}
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Rename Session"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={() => {
                            if (guardDemo()) return;
                            push(
                              <RenameSessionForm
                                session={session}
                                currentTitle={title}
                                onRename={(newTitle) =>
                                  handleRename(session, newTitle)
                                }
                              />,
                            );
                          }}
                        />
                        {isDemoMode ? (
                          demoBlockedAction(
                            "Open Project Folder",
                            Icon.Folder,
                            Keyboard.Shortcut.Common.Open,
                          )
                        ) : (
                          <Action.ShowInFinder
                            title="Open Project Folder"
                            path={session.cwd}
                            shortcut={Keyboard.Shortcut.Common.Open}
                          />
                        )}
                        {isDemoMode ? (
                          demoBlockedAction("Reveal in Finder", Icon.Finder, {
                            modifiers: ["cmd", "shift"],
                            key: "f",
                          })
                        ) : (
                          <Action.ShowInFinder
                            title="Reveal in Finder"
                            path={session.filePath}
                            shortcut={{
                              modifiers: ["cmd", "shift"],
                              key: "f",
                            }}
                          />
                        )}
                        <Action
                          title={`Show: ${STATUS_FILTER_LABEL[STATUS_FILTER_CYCLE[statusFilter]]} Sessions`}
                          icon={Icon.Filter}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                          onAction={() =>
                            setStatusFilter(STATUS_FILTER_CYCLE[statusFilter])
                          }
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                          onAction={() => revalidate()}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Delete Session"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={() => {
                            if (guardDemo()) return;
                            handleDelete(session);
                          }}
                        />
                      </ActionPanel.Section>
                      {environment.isDevelopment && (
                        <ActionPanel.Section title="Development">
                          <Action
                            title={
                              isDemoMode
                                ? "Turn off Demo Data"
                                : "Turn on Demo Data"
                            }
                            icon={Icon.Camera}
                            onAction={() =>
                              setDemoModeValue(!(demoModeValue ?? false))
                            }
                          />
                        </ActionPanel.Section>
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}

function RenameSessionForm({
  session,
  currentTitle,
  onRename,
}: {
  session: SessionMeta;
  currentTitle: string;
  onRename: (newTitle: string) => void | Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: { title: string }) => {
              await onRename(values.title);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Session"
        text={session.slug ?? session.sessionId}
      />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={currentTitle}
        autoFocus
      />
    </Form>
  );
}
