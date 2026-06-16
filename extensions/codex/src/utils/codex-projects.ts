import { Color } from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import nodePath from "node:path";
import {
  CODEX_THREAD_LIST_LOOKBACK_DAYS,
  CODEX_THREAD_LIST_MAX_RESULTS,
  type CodexThread,
  listThreads,
} from "./codex-app-server";
import { getErrorMessage, getProjectName, tildeifyPath } from "./format";
import { expandTildePath } from "./shell";

type ProjectRecordSource = "recent" | "projects-folder";

type ProjectRecord = {
  cwd: string;
  count: number;
  updatedAt: number;
  source: ProjectRecordSource;
};

export type CodexProjectOption = {
  cwd: string;
  title: string;
  count: number;
  updatedAt: number;
  color: Color.ColorLike;
  keywords: string[];
  sources: ProjectRecordSource[];
};

export type NewThreadProjectOptionsResult = {
  options: CodexProjectOption[];
  warning: string | null;
};

const PROJECT_FILTER_COLORS = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
] as const;

export function buildCodexProjectOptions(
  threads: CodexThread[],
  selectedCwd: string | null = null,
): CodexProjectOption[] {
  return buildProjectOptions(
    threads.map((thread) => ({
      cwd: thread.cwd,
      count: 1,
      updatedAt: thread.updatedAt,
      source: "recent",
    })),
    selectedCwd,
  );
}

export async function loadNewThreadProjectOptions({
  defaultProjectDirectory,
  projectsDirectory,
}: {
  defaultProjectDirectory?: string;
  projectsDirectory?: string;
}): Promise<NewThreadProjectOptionsResult> {
  const defaultCwd = normalizeOptionalPath(defaultProjectDirectory);
  const [recentProjects, folderProjects] = await Promise.all([
    loadRecentProjectRecords(),
    loadProjectsDirectoryRecords(projectsDirectory),
  ]);
  const warning = [recentProjects.warning, folderProjects.warning]
    .filter(Boolean)
    .join(" ");

  return {
    options: buildProjectOptions(
      [...recentProjects.records, ...folderProjects.records],
      null,
    ).filter((option) => option.cwd !== defaultCwd),
    warning: warning || null,
  };
}

function buildProjectOptions(
  records: ProjectRecord[],
  selectedCwd: string | null,
): CodexProjectOption[] {
  const projectsByCwd = new Map<
    string,
    {
      cwd: string;
      count: number;
      updatedAt: number;
      sources: Set<ProjectRecordSource>;
    }
  >();
  const cwdsByBasename = new Map<string, Set<string>>();

  for (const record of records) {
    const normalizedCwd = normalizeOptionalPath(record.cwd);
    if (!normalizedCwd) {
      continue;
    }

    const basename = getProjectName(normalizedCwd);
    const cwds = cwdsByBasename.get(basename) ?? new Set<string>();
    cwds.add(normalizedCwd);
    cwdsByBasename.set(basename, cwds);

    const project = projectsByCwd.get(normalizedCwd);
    if (project) {
      project.count += record.count;
      project.updatedAt = Math.max(project.updatedAt, record.updatedAt);
      project.sources.add(record.source);
      continue;
    }

    projectsByCwd.set(normalizedCwd, {
      cwd: normalizedCwd,
      count: record.count,
      updatedAt: record.updatedAt,
      sources: new Set([record.source]),
    });
  }

  const normalizedSelectedCwd = normalizeOptionalPath(selectedCwd);
  if (normalizedSelectedCwd && !projectsByCwd.has(normalizedSelectedCwd)) {
    const basename = getProjectName(normalizedSelectedCwd);
    const cwds = cwdsByBasename.get(basename) ?? new Set<string>();
    cwds.add(normalizedSelectedCwd);
    cwdsByBasename.set(basename, cwds);

    projectsByCwd.set(normalizedSelectedCwd, {
      cwd: normalizedSelectedCwd,
      count: 0,
      updatedAt: 0,
      sources: new Set(["recent"]),
    });
  }

  return Array.from(projectsByCwd.values())
    .map((project) => {
      const basename = getProjectName(project.cwd);
      const shouldDisambiguate = (cwdsByBasename.get(basename)?.size ?? 0) > 1;
      const pathLabel = tildeifyPath(project.cwd);
      const titlePrefix = shouldDisambiguate
        ? `${basename} - ${pathLabel}`
        : basename;
      const threadCount =
        project.count > 0
          ? ` (${project.count} ${project.count === 1 ? "thread" : "threads"})`
          : "";

      return {
        cwd: project.cwd,
        title: `${titlePrefix}${threadCount}`,
        count: project.count,
        updatedAt: project.updatedAt,
        color: getProjectFilterColor(project.cwd),
        keywords: [basename, pathLabel, project.cwd],
        sources: Array.from(project.sources).sort(),
      };
    })
    .sort(
      (left, right) =>
        right.updatedAt - left.updatedAt ||
        right.count - left.count ||
        left.title.localeCompare(right.title),
    );
}

async function loadRecentProjectRecords(): Promise<{
  records: ProjectRecord[];
  warning: string | null;
}> {
  try {
    const [activeThreads, archivedThreads] = await Promise.all([
      listThreads({
        archived: false,
        maxResults: CODEX_THREAD_LIST_MAX_RESULTS,
        windowDays: CODEX_THREAD_LIST_LOOKBACK_DAYS,
      }),
      listThreads({
        archived: true,
        maxResults: CODEX_THREAD_LIST_MAX_RESULTS,
        windowDays: CODEX_THREAD_LIST_LOOKBACK_DAYS,
      }),
    ]);

    return {
      records: [...activeThreads, ...archivedThreads].map((thread) => ({
        cwd: thread.cwd,
        count: 1,
        updatedAt: thread.updatedAt,
        source: "recent",
      })),
      warning: null,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      records: [],
      warning: `Recent projects unavailable: ${message}`,
    };
  }
}

async function loadProjectsDirectoryRecords(
  projectsDirectory: string | undefined,
): Promise<{ records: ProjectRecord[]; warning: string | null }> {
  const root = normalizeOptionalPath(projectsDirectory);
  if (!root) {
    return { records: [], warning: null };
  }

  if (!nodePath.isAbsolute(root)) {
    return {
      records: [],
      warning: "Projects Folder must be an absolute local directory.",
    };
  }

  try {
    const entries = await readdir(root, { withFileTypes: true });
    const records = (
      await Promise.all(
        entries
          .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
          .map(async (entry) => {
            const cwd = nodePath.join(root, entry.name);
            const stats = await stat(cwd).catch(() => undefined);
            if (!stats?.isDirectory()) {
              return null;
            }

            return {
              cwd,
              count: 0,
              updatedAt: Math.floor(stats.mtimeMs / 1000),
              source: "projects-folder" as const,
            };
          }),
      )
    ).filter((record): record is NonNullable<typeof record> => Boolean(record));

    return { records, warning: null };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      records: [],
      warning: `Projects Folder unavailable: ${message}`,
    };
  }
}

function normalizeOptionalPath(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? expandTildePath(trimmed) : null;
}

function getProjectFilterColor(cwd: string): Color.ColorLike {
  return PROJECT_FILTER_COLORS[hashString(cwd) % PROJECT_FILTER_COLORS.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
