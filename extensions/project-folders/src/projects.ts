import { join } from "node:path";
import { type ProjectLinks } from "./links";
import { refreshSnapshot, type Snapshot } from "./snapshot";

export type Project = {
  name: string;
  path: string;
  year: string;
  mtime: number;
  datePrefix: string | null;
  monthName: string | null;
  links: ProjectLinks;
  subfolders: string[];
};

export type ProjectIndex = {
  years: { year: string; projects: Project[] }[];
};

const PREFIX_RE = /^(\d{2})(\d{2})_/;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseDatePrefix(name: string): { mmdd: string; month: string } | null {
  const m = name.match(PREFIX_RE);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  if (mm < 1 || mm > 12) return null;
  return { mmdd: `${m[1]}/${m[2]}`, month: MONTHS[mm - 1] };
}

function snapshotToIndex(snapshot: Snapshot): ProjectIndex {
  return {
    years: snapshot.years.map((y) => ({
      year: y.year,
      projects: y.projects.map((p): Project => {
        const prefix = parseDatePrefix(p.name);
        return {
          name: p.name,
          path: join(snapshot.root, y.year, p.name),
          year: y.year,
          mtime: p.mtime,
          datePrefix: prefix?.mmdd ?? null,
          monthName: prefix?.month ?? null,
          links: p.links,
          subfolders: p.subfolders,
        };
      }),
    })),
  };
}

export async function buildProjectIndex(root: string): Promise<ProjectIndex> {
  const snapshot = await refreshSnapshot(root);
  return snapshotToIndex(snapshot);
}

export function indexByPath(index: ProjectIndex): Map<string, Project> {
  const byPath = new Map<string, Project>();
  for (const s of index.years) for (const p of s.projects) byPath.set(p.path, p);
  return byPath;
}

// Years are sorted newest-first and projects within a year by mtime desc, so the first
// project seen for a gid is the most recent - keep it if two folders share a gid.
export function indexByGid(index: ProjectIndex): Map<string, Project> {
  const byGid = new Map<string, Project>();
  for (const s of index.years)
    for (const p of s.projects) if (p.links.gid && !byGid.has(p.links.gid)) byGid.set(p.links.gid, p);
  return byGid;
}

export function projectKeywords(p: Project): string[] {
  const fromName = p.name
    .replace(/[_\-./]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kw: string[] = [...fromName, p.year];
  if (p.monthName) kw.push(p.monthName);
  if (p.links.gid) kw.push(p.links.gid);
  return kw;
}
