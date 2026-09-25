import { readdir, stat } from "node:fs/promises";
import nodePath from "node:path";
import {
  threadListMaxResults,
  type CodexThread,
  listThreads,
} from "./app-server";
import {
  formatCount,
  getErrorMessage,
  getProjectName,
  tildeifyPath,
} from "./format";
import { expandTildePath } from "./shell";

export type WorkingDirectoryRecord = {
  cwd: string;
  count: number;
  updatedAt: number;
};

export type WorkingDirectoryOption = {
  cwd: string;
  title: string;
  count: number;
  updatedAt: number;
  keywords: string[];
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
      continue;
    }

    projectsByCwd.set(normalizedCwd, {
      cwd: normalizedCwd,
      count: record.count,
      updatedAt: record.updatedAt,
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
        project.count > 0 ? ` (${formatCount(project.count, "thread")})` : "";

      return {
        cwd: project.cwd,
        title: `${titlePrefix}${threadCount}`,
        count: project.count,
        updatedAt: project.updatedAt,
        keywords: [basename, pathLabel, project.cwd],
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
    listThreads({ archived: false, maxResults: threadListMaxResults }),
    listThreads({ archived: true, maxResults: threadListMaxResults }),
  ]);

  return [...activeThreads, ...archivedThreads].map((thread) => ({
    cwd: thread.cwd,
    count: 1,
    updatedAt: thread.updatedAt,
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
