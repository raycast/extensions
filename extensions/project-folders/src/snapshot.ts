import { environment } from "@raycast/api";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LINK_FILES, readAllLinks, type LinkKind, type ProjectLinks } from "./links";

const YEAR_RE = /^\d{4}$/;
const SNAPSHOT_VERSION = 3;
const SNAPSHOT_PATH = join(environment.supportPath, "index.json");
const LINK_KINDS = Object.keys(LINK_FILES) as LinkKind[];

type LinkMtimes = Partial<Record<LinkKind, number>>;

export type SnapshotProject = {
  name: string;
  mtime: number;
  linkMtimes: LinkMtimes;
  links: ProjectLinks;
  subfolders: string[];
};

export type SnapshotYear = {
  year: string;
  mtime: number;
  projects: SnapshotProject[];
};

export type Snapshot = {
  version: number;
  root: string;
  years: SnapshotYear[];
};

async function loadSnapshot(root: string): Promise<Snapshot | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed.version !== SNAPSHOT_VERSION) return null;
    if (parsed.root !== root) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot), "utf8");
}

async function readSubfolders(projectPath: string): Promise<string[]> {
  try {
    const entries = await readdir(projectPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function readLinkMtimes(projectPath: string): Promise<LinkMtimes> {
  const entries = await Promise.all(
    LINK_KINDS.map(async (kind) => {
      try {
        const linkStat = await stat(join(projectPath, LINK_FILES[kind]));
        return linkStat.isFile() ? ([kind, linkStat.mtimeMs] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((entry): entry is readonly [LinkKind, number] => entry !== null));
}

async function scanProject(
  yearPath: string,
  name: string,
  diskMtime: number,
  cached: SnapshotProject | undefined,
): Promise<SnapshotProject> {
  const projectPath = join(yearPath, name);
  const linkMtimes = await readLinkMtimes(projectPath);
  const canReuseLinks = cached ? LINK_KINDS.every((kind) => cached.linkMtimes[kind] === linkMtimes[kind]) : false;
  const canReuseSubfolders = cached ? cached.mtime === diskMtime : false;
  if (cached && canReuseLinks && canReuseSubfolders) return cached;

  const [links, subfolders] = await Promise.all([
    cached && canReuseLinks ? cached.links : readAllLinks(projectPath),
    cached && canReuseSubfolders ? cached.subfolders : readSubfolders(projectPath),
  ]);
  return { name, mtime: diskMtime, linkMtimes, links, subfolders };
}

async function scanYear(root: string, year: string, cached: SnapshotYear | undefined): Promise<SnapshotYear> {
  const yearPath = join(root, year);
  const yearStat = await stat(yearPath);

  const entries = await readdir(yearPath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const cachedByName = new Map((cached?.projects ?? []).map((p) => [p.name, p]));

  const projects = await Promise.all(
    dirs.map(async (e) => {
      const projectPath = join(yearPath, e.name);
      try {
        const s = await stat(projectPath);
        return scanProject(yearPath, e.name, s.mtimeMs, cachedByName.get(e.name));
      } catch {
        return null;
      }
    }),
  );

  return {
    year,
    mtime: yearStat.mtimeMs,
    projects: projects.filter((p): p is SnapshotProject => p !== null).sort((a, b) => b.mtime - a.mtime),
  };
}

export async function refreshSnapshot(root: string): Promise<Snapshot> {
  const cached = await loadSnapshot(root);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
  const yearNames = entries
    .filter((e) => e.isDirectory() && YEAR_RE.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => b.localeCompare(a));

  const cachedByYear = new Map((cached?.years ?? []).map((y) => [y.year, y]));

  const years = await Promise.all(yearNames.map((y) => scanYear(root, y, cachedByYear.get(y))));

  const snapshot: Snapshot = { version: SNAPSHOT_VERSION, root, years };
  await saveSnapshot(snapshot);
  return snapshot;
}

export async function refreshProjectInSnapshot(root: string, year: string, name: string): Promise<Snapshot | null> {
  const cached = await loadSnapshot(root);
  if (!cached) return null;
  const yearEntry = cached.years.find((y) => y.year === year);
  if (!yearEntry) return null;
  const projectPath = join(root, year, name);
  let diskMtime: number;
  try {
    diskMtime = (await stat(projectPath)).mtimeMs;
  } catch {
    yearEntry.projects = yearEntry.projects.filter((p) => p.name !== name);
    await saveSnapshot(cached);
    return cached;
  }
  const fresh = await scanProject(join(root, year), name, diskMtime, undefined);
  yearEntry.projects = [fresh, ...yearEntry.projects.filter((p) => p.name !== name)].sort((a, b) => b.mtime - a.mtime);
  await saveSnapshot(cached);
  return cached;
}
