import * as React from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, relative } from "node:path";
import {
  isCodexDesktopInstalled,
  newTaskDeepLink,
  openDeepLink,
  openWorkspace,
  openWorkspaceViaCli,
  showFailureToast,
} from "./lib/open-codex";
import { worktreesDir } from "./lib/codex-paths";
import { loadProjects, projectName, type ProjectRow } from "./lib/threads";
import { loadSessionStates, type SessionStateMap } from "./lib/session-status";

type ProjectWithOrigin = ProjectRow & { git_origin_url?: string | null };
type ValidationStatus = "existing" | "missing";

const emptyRows: ProjectRow[] = [];
const validationConcurrency = 8;

function originFor(row: ProjectRow): string | undefined {
  const origin = (row as ProjectWithOrigin).git_origin_url;
  return origin?.trim() || undefined;
}

function pathSegments(path: string): string[] {
  return path.split(/[\\/:@#?&=.]+/).filter(Boolean);
}

function projectKeywords(row: ProjectRow): string[] {
  const origin = originFor(row);
  return [row.cwd, ...pathSegments(row.cwd), ...(origin ? [origin, ...pathSegments(origin)] : [])];
}

function abbreviatedParent(path: string): string {
  const parent = dirname(path);
  const home = homedir();
  if (parent === home) return "~";
  if (parent.startsWith(`${home}/`)) return `~/${parent.slice(home.length + 1)}`;
  return parent;
}

function isUnderWorktrees(path: string): boolean {
  const worktrees = worktreesDir();
  const pathFromWorktrees = relative(worktrees, path);
  return pathFromWorktrees === "" || (!pathFromWorktrees.startsWith("..") && !pathFromWorktrees.startsWith("/"));
}

async function findMissingProjects(rows: ProjectRow[]): Promise<Set<string>> {
  const missing = new Set<string>();
  let nextIndex = 0;

  async function validateNext(): Promise<void> {
    while (nextIndex < rows.length) {
      const row = rows[nextIndex++];
      try {
        const info = await stat(row.cwd);
        if (!info.isDirectory()) missing.add(row.cwd);
      } catch {
        missing.add(row.cwd);
      }
    }
  }

  const workerCount = Math.min(validationConcurrency, rows.length);
  await Promise.all(Array.from({ length: workerCount }, () => validateNext()));
  return missing;
}

function useProjectValidation(rows: ProjectRow[]) {
  const [statuses, setStatuses] = React.useState<Record<string, ValidationStatus>>({});

  React.useEffect(() => {
    let cancelled = false;
    setStatuses({});
    void findMissingProjects(rows).then((missing) => {
      if (cancelled) return;
      const nextStatuses: Record<string, ValidationStatus> = {};
      for (const row of rows) nextStatuses[row.cwd] = missing.has(row.cwd) ? "missing" : "existing";
      setStatuses(nextStatuses);
    });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  return {
    existing: rows.filter((row) => statuses[row.cwd] !== "missing"),
    missing: rows.filter((row) => statuses[row.cwd] === "missing"),
  };
}

async function openTerminalHere(path: string): Promise<boolean> {
  try {
    await open(path, "com.apple.Terminal");
    return true;
  } catch {
    await showFailureToast("Could not open the terminal", "Check that Terminal is available on this Mac.");
    return false;
  }
}

async function showInFinder(path: string): Promise<boolean> {
  try {
    await open(path);
    return true;
  } catch {
    await showFailureToast("Could not show the folder in Finder", "Check that the folder still exists.");
    return false;
  }
}

function useProjectActions(
  path: string,
  desktopInstalled: boolean | undefined,
  row: ProjectRow | undefined,
  visitItem: ((item: ProjectRow) => Promise<void>) | undefined,
  resetRanking: ((item: ProjectRow) => Promise<void>) | undefined,
) {
  const markVisited = React.useCallback(
    async (opened: boolean) => {
      if (opened && row && visitItem) await visitItem(row);
    },
    [row, visitItem],
  );
  const openInDesktop = React.useCallback(async () => {
    const opened = await openWorkspace(path);
    await markVisited(opened);
  }, [markVisited, path]);
  const openInCli = React.useCallback(async () => {
    const opened = await openWorkspaceViaCli(path);
    await markVisited(opened);
  }, [markVisited, path]);
  const openInTerminal = React.useCallback(async () => {
    const opened = await openTerminalHere(path);
    await markVisited(opened);
  }, [markVisited, path]);
  const openFolderInFinder = React.useCallback(async () => {
    const opened = await showInFinder(path);
    await markVisited(opened);
  }, [markVisited, path]);

  // Tri-state: while the Desktop check is pending, use a neutral title;
  // openWorkspace() re-checks at action time, so the behavior stays correct.
  const primaryTitle =
    desktopInstalled === true
      ? "Open in Codex Desktop"
      : desktopInstalled === false
        ? "Open Via Codex CLI"
        : "Open Project";
  const primaryAction = desktopInstalled === false ? openInCli : openInDesktop;

  return {
    primaryTitle,
    primaryAction,
    openInDesktop,
    openInCli,
    openInTerminal,
    openFolderInFinder,
    reset: row && resetRanking ? () => resetRanking(row) : undefined,
  };
}

function ProjectActions({
  path,
  row,
  desktopInstalled,
  visitItem,
  resetRanking,
}: {
  path: string;
  row?: ProjectRow;
  desktopInstalled: boolean | undefined;
  visitItem?: (item: ProjectRow) => Promise<void>;
  resetRanking?: (item: ProjectRow) => Promise<void>;
}) {
  const actions = useProjectActions(path, desktopInstalled, row, visitItem, resetRanking);
  return (
    <ActionPanel>
      <Action title={actions.primaryTitle} icon={Icon.AppWindow} onAction={() => void actions.primaryAction()} />
      {desktopInstalled !== false && (
        <Action title="Open Via Codex CLI" icon={Icon.Terminal} onAction={() => void actions.openInCli()} />
      )}
      <Action title="Open Terminal Here" icon={Icon.Terminal} onAction={() => void actions.openInTerminal()} />
      <Action title="Show in Finder" icon={Icon.Finder} onAction={() => void actions.openFolderInFinder()} />
      <Action title="Copy Path" icon={Icon.CopyClipboard} onAction={() => void Clipboard.copy(path)} />
      {actions.reset && (
        <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => void actions.reset?.()} />
      )}
    </ActionPanel>
  );
}

function ProjectItem({
  row,
  stateAccessory,
  desktopInstalled,
  visitItem,
  resetRanking,
}: {
  row: ProjectRow;
  stateAccessory?: { tag: { value: string; color: Color } };
  desktopInstalled: boolean | undefined;
  visitItem: (item: ProjectRow) => Promise<void>;
  resetRanking: (item: ProjectRow) => Promise<void>;
}) {
  return (
    <List.Item
      id={row.cwd}
      title={projectName(row.cwd)}
      subtitle={abbreviatedParent(row.cwd)}
      keywords={projectKeywords(row)}
      icon={Icon.Folder}
      accessories={[
        stateAccessory,
        { date: new Date(row.last_used) },
        { text: `${row.session_count} sessions` },
      ].filter((accessory): accessory is NonNullable<typeof accessory> => accessory !== undefined)}
      actions={
        <ProjectActions
          path={row.cwd}
          row={row}
          desktopInstalled={desktopInstalled}
          visitItem={visitItem}
          resetRanking={resetRanking}
        />
      }
    />
  );
}

function MissingProjectItem({ row, desktopInstalled }: { row: ProjectRow; desktopInstalled: boolean | undefined }) {
  const origin = originFor(row);
  return (
    <List.Item
      id={`missing:${row.cwd}`}
      title={projectName(row.cwd)}
      subtitle={abbreviatedParent(row.cwd)}
      keywords={projectKeywords(row)}
      icon={Icon.Folder}
      accessories={[{ text: "Folder not found" }, { text: `${row.session_count} sessions` }]}
      actions={
        <ActionPanel>
          {/* Reopening a deleted folder by its remote is a Desktop-only
              capability — there is no local path for the CLI to open. */}
          {origin && desktopInstalled === true && (
            <Action
              title="Reopen by Git Remote"
              icon={Icon.Download}
              onAction={() => void openDeepLink(newTaskDeepLink({ originUrl: origin }))}
            />
          )}
          {origin && (
            <Action
              title="Copy Git Remote URL"
              icon={Icon.CopyClipboard}
              onAction={() => void Clipboard.copy(origin)}
            />
          )}
          <Action title="Copy Path" icon={Icon.CopyClipboard} onAction={() => void Clipboard.copy(row.cwd)} />
        </ActionPanel>
      }
    />
  );
}

function ChooseFolderForm({ desktopInstalled }: { desktopInstalled: boolean | undefined }) {
  const navigation = useNavigation();
  const [selectedPath, setSelectedPath] = React.useState<string>();

  const requireSelectedPath = React.useCallback(async () => {
    if (selectedPath) return selectedPath;
    await showToast({
      style: Toast.Style.Failure,
      title: "No folder selected",
      message: "Choose a project folder first.",
    });
    return undefined;
  }, [selectedPath]);

  const openSelected = React.useCallback(
    async (openAction: (path: string) => Promise<boolean>) => {
      const path = await requireSelectedPath();
      if (path && (await openAction(path))) navigation.pop();
    },
    [navigation, requireSelectedPath],
  );

  const onSubmit = async (values: { folder?: string[] }) => {
    const path = values.folder?.[0];
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder selected",
        message: "Choose a project folder first.",
      });
      return;
    }
    const opened = await (desktopInstalled === false ? openWorkspaceViaCli(path) : openWorkspace(path));
    if (opened) navigation.pop();
  };

  return (
    <Form
      navigationTitle="Choose Another Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={desktopInstalled === false ? "Open Via Codex CLI" : "Open Project"}
            onSubmit={onSubmit}
          />
          {desktopInstalled !== false && (
            <Action
              title="Open Via Codex CLI"
              icon={Icon.Terminal}
              onAction={() => void openSelected(openWorkspaceViaCli)}
            />
          )}
          <Action
            title="Open Terminal Here"
            icon={Icon.Terminal}
            onAction={() => void openSelected(openTerminalHere)}
          />
          <Action title="Show in Finder" icon={Icon.Finder} onAction={() => void openSelected(showInFinder)} />
          <Action
            title="Copy Path"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              const path = await requireSelectedPath();
              if (path) await Clipboard.copy(path);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Project Folder"
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
        onChange={(paths) => setSelectedPath(paths[0])}
      />
    </Form>
  );
}

function ChooseFolderItem({ desktopInstalled }: { desktopInstalled: boolean | undefined }) {
  const { push } = useNavigation();
  return (
    <List.Item
      id="choose-another-folder"
      title="Choose Another Folder…"
      icon={Icon.NewFolder}
      actions={
        <ActionPanel>
          <Action
            title="Choose Folder"
            icon={Icon.NewFolder}
            onAction={() => push(<ChooseFolderForm desktopInstalled={desktopInstalled} />)}
          />
        </ActionPanel>
      }
    />
  );
}

function DegradedNote() {
  return (
    <List.Section title="Project history unavailable">
      <List.Item
        id="degraded-project-state"
        title="State database unavailable"
        subtitle="Choose a folder below to open a project directly."
        icon={Icon.Warning}
      />
    </List.Section>
  );
}

export default function OpenProject() {
  const { data, isLoading } = useCachedPromise(loadProjects, [], { keepPreviousData: true });
  const { data: sessionStates, revalidate: revalidateStates } = useCachedPromise(loadSessionStates, [], {
    keepPreviousData: true,
  });
  const { data: desktopInstalled } = useCachedPromise(isCodexDesktopInstalled);
  const states: SessionStateMap = sessionStates || {};
  React.useEffect(() => {
    const interval = setInterval(() => void revalidateStates(), 2000);
    return () => clearInterval(interval);
  }, [revalidateStates]);
  const loadedRows = data?.rows;
  const rows = React.useMemo(() => (loadedRows ?? emptyRows).filter((row) => !isUnderWorktrees(row.cwd)), [loadedRows]);
  const { existing, missing } = useProjectValidation(rows);
  const stateAccessories = React.useMemo(() => {
    const counts = new Map<string, { working: number; unread: number }>();
    for (const state of Object.values(states)) {
      if (!state.cwd) continue;
      const staleWorking = state.status === "working" && Date.now() - Date.parse(state.updatedAt) > 24 * 60 * 60 * 1000;
      if (staleWorking) continue;
      const count = counts.get(state.cwd) || { working: 0, unread: 0 };
      if (state.status === "working") count.working += 1;
      else if (state.status === "done" && state.unread) count.unread += 1;
      counts.set(state.cwd, count);
    }
    return counts;
  }, [states]);

  const projectStateAccessory = React.useCallback(
    (cwd: string): { tag: { value: string; color: Color } } | undefined => {
      const count = stateAccessories.get(cwd);
      if (!count) return undefined;
      if (count.working > 0) {
        return { tag: { value: `${count.working} working`, color: Color.Orange } };
      }
      if (count.unread > 0) {
        return { tag: { value: `${count.unread} completed`, color: Color.Green } };
      }
      return undefined;
    },
    [stateAccessories],
  );
  const {
    data: sortedExisting,
    visitItem,
    resetRanking,
  } = useFrecencySorting(existing, {
    namespace: "codex-projects",
    key: (row) => row.cwd,
    sortUnvisited: (a, b) => b.last_used - a.last_used,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search project folders">
      {data?.degraded && <DegradedNote />}
      <List.Section title="Projects">
        {sortedExisting.map((row) => (
          <ProjectItem
            key={row.cwd}
            row={row}
            stateAccessory={projectStateAccessory(row.cwd)}
            desktopInstalled={desktopInstalled}
            visitItem={visitItem}
            resetRanking={resetRanking}
          />
        ))}
      </List.Section>
      {missing.length > 0 && (
        <List.Section title="Missing Folders">
          {[...missing]
            .sort((a, b) => b.last_used - a.last_used)
            .map((row) => (
              <MissingProjectItem key={row.cwd} row={row} desktopInstalled={desktopInstalled} />
            ))}
        </List.Section>
      )}
      <ChooseFolderItem desktopInstalled={desktopInstalled} />
    </List>
  );
}
