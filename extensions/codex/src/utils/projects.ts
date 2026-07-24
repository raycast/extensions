import { readdir, stat } from "node:fs/promises";
import nodePath from "node:path";
import {
  threadListLookbackDays,
  threadListMaxResults,
  type CodexThread,
  listThreads,
} from "./app-server";
import { getErrorMessage, getProjectName, tildeifyPath } from "./format";
import { expandTildePath } from "./shell";

type WorkingDirectoryRecordSource = "recent" | "projects-folder";

export type WorkingDirectoryRecord = {
  cwd: string;
  count: number;
  updatedAt: number;
  source: WorkingDirectoryRecordSource;
};

export type WorkingDirectoryOption = {
  cwd: string;
  title: string;
  count: number;
  updatedAt: number;
  keywords: string[];
  sources: WorkingDirectoryRecordSource[];
};

export type ProjectsFolderScan = {
  records: WorkingDirectoryRecord[];
  warning: string | null;
};

export function buildWorkingDirectoryOptionsFromThreads(
  threads: CodexThread[],
  selectedCwd: string | null = null,
): WorkingDirectoryOption[] {
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

export function buildProjectsFolderOptions({
  folderRecords,
  recentRecords,
  defaultProjectDirectory,
}: {
  folderRecords: WorkingDirectoryRecord[];
  recentRecords: WorkingDirectoryRecord[];
  defaultProjectDirectory?: string;
}): WorkingDirectoryOption[] {
  const defaultCwd = normalizeOptionalPath(defaultProjectDirectory);
  const folderCwds = new Set(
    folderRecords
      .map((record) => normalizeOptionalPath(record.cwd))
      .filter((cwd): cwd is string => Boolean(cwd)),
  );
  const matchingRecentRecords = recentRecords.filter((record) => {
    const cwd = normalizeOptionalPath(record.cwd);
    return cwd ? folderCwds.has(cwd) : false;
  });

  return buildProjectOptions([...folderRecords, ...matchingRecentRecords], null)
    .filter((option) => option.cwd !== defaultCwd)
    .sort((left, right) => left.title.localeCompare(right.title));
}

function buildProjectOptions(
  records: WorkingDirectoryRecord[],
  selectedCwd: string | null,
): WorkingDirectoryOption[] {
  const projectsByCwd = new Map<
    string,
    {
      cwd: string;
      count: number;
      updatedAt: number;
      sources: Set<WorkingDirectoryRecordSource>;
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

export async function loadRecentWorkingDirectoryRecords(): Promise<
  WorkingDirectoryRecord[]
> {
  const [activeThreads, archivedThreads] = await Promise.all([
    listThreads({
      archived: false,
      maxResults: threadListMaxResults,
      windowDays: threadListLookbackDays,
    }),
    listThreads({
      archived: true,
      maxResults: threadListMaxResults,
      windowDays: threadListLookbackDays,
    }),
  ]);

  return [...activeThreads, ...archivedThreads].map((thread) => ({
    cwd: thread.cwd,
    count: 1,
    updatedAt: thread.updatedAt,
    source: "recent",
  }));
}

export async function loadProjectsFolderRecords(
  projectsDirectory: string | undefined,
): Promise<ProjectsFolderScan> {
  const root = normalizeOptionalPath(projectsDirectory);
  if (!root) {
    return { records: [], warning: null };
  }

  if (!nodePath.isAbsolute(root)) {
    return {
      records: [],
      warning: "Working Directory Root must be an absolute local directory.",
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
      warning: `Working Directory Root unavailable: ${message}`,
    };
  }
}

function normalizeOptionalPath(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? expandTildePath(trimmed) : null;
}
