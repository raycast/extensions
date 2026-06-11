import { Color } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { codexPath } from "./codex";
import { extensionPaths } from "./config";
import { quote } from "./utils/sql";

const execFileAsync = promisify(execFile);
const paths = extensionPaths();
const projectIconExtensions = [
  "png",
  "jpg",
  "jpeg",
  "svg",
  "gif",
  "webp",
  "ico",
];
const iconHydrationBatchSize = 24;
const iconHydrationPriorityCount = 40;

type ProjectRow = {
  id: string;
  worktree: string;
  name?: string;
  icon_color?: string;
  startup_command?: string;
  time_updated?: string;
  sandbox_count?: string;
  has_icon?: string;
};

type CachedProject = {
  id: string;
  worktree: string;
  name?: string;
  iconColor?: string;
  startupCommand?: string;
  sandboxCount: number;
  updatedAt?: number;
  hasIcon: boolean;
  relatedIds?: string[];
};

export type Project = {
  id: string;
  worktree: string;
  name?: string;
  icon?: string;
  iconColor?: string;
  tint?: Color;
  startupCommand?: string;
  sandboxCount: number;
  updatedAt?: number;
  hasIcon: boolean;
  isFavorite: boolean;
  relatedIds: string[];
};

// eslint-disable-next-line no-unused-vars
type HydrationUpdate = (_items: Project[]) => void;

let iconManifestCache: Record<string, string> | undefined;
let favoritesCache: Set<string> | undefined;

function supportDir() {
  mkdirSync(paths.supportPath, { recursive: true });
  return paths.supportPath;
}

function iconCacheDir() {
  mkdirSync(paths.projectIconsPath, { recursive: true });
  return paths.projectIconsPath;
}

function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  supportDir();
  writeFileSync(filePath, JSON.stringify(value), "utf8");
}

function getIconManifest() {
  iconManifestCache ??= readJsonFile<Record<string, string>>(
    paths.iconManifestPath,
    {},
  );
  return iconManifestCache;
}

function writeIconManifest(manifest: Record<string, string>) {
  iconManifestCache = manifest;
  iconCacheDir();
  writeFileSync(paths.iconManifestPath, JSON.stringify(manifest), "utf8");
}

function getFavorites() {
  favoritesCache ??= new Set(readJsonFile<string[]>(paths.favoritesPath, []));
  return favoritesCache;
}

function writeFavorites(favorites: Set<string>) {
  favoritesCache = favorites;
  writeJsonFile(paths.favoritesPath, [...favorites]);
}

function readProjectIndex() {
  return readJsonFile<CachedProject[]>(paths.projectIndexPath, []);
}

function colorKey(input?: Color) {
  switch (input) {
    case Color.Red:
      return "red";
    case Color.Orange:
      return "orange";
    case Color.Yellow:
      return "yellow";
    case Color.Green:
      return "green";
    case Color.Blue:
      return "blue";
    case Color.Magenta:
      return "magenta";
    case Color.SecondaryText:
      return "secondary";
    default:
      return undefined;
  }
}

function writeProjectIndex(items: Project[]) {
  writeJsonFile(
    paths.projectIndexPath,
    items.map((item) => ({
      id: item.id,
      worktree: item.worktree,
      name: item.name,
      iconColor: item.iconColor ?? colorKey(item.tint),
      startupCommand: item.startupCommand,
      sandboxCount: item.sandboxCount,
      updatedAt: item.updatedAt,
      hasIcon: item.hasIcon,
      relatedIds: item.relatedIds,
    })),
  );
}

function favoriteKeys(
  project: Pick<Project, "id" | "worktree" | "relatedIds">,
) {
  return [project.worktree, project.id, ...project.relatedIds];
}

function isProjectFavorite(
  favorites: Set<string>,
  project: Pick<Project, "id" | "worktree" | "relatedIds">,
) {
  return favoriteKeys(project).some((key) => favorites.has(key));
}

function tint(input: string | null | undefined) {
  if (!input) return undefined;
  const key = input.toLowerCase();
  if (key.includes("red")) return Color.Red;
  if (key.includes("orange")) return Color.Orange;
  if (key.includes("yellow")) return Color.Yellow;
  if (key.includes("green")) return Color.Green;
  if (key.includes("blue")) return Color.Blue;
  if (key.includes("magenta") || key.includes("pink") || key.includes("purple"))
    return Color.Magenta;
  if (key.includes("secondary") || key.includes("gray") || key.includes("grey"))
    return Color.SecondaryText;
  return undefined;
}

function sortProjects(items: Project[]) {
  return items.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;

    const timeA = a.updatedAt ?? 0;
    const timeB = b.updatedAt ?? 0;
    if (timeA !== timeB) return timeB - timeA;

    const labelA = a.name ?? a.worktree;
    const labelB = b.name ?? b.worktree;
    return labelA.localeCompare(labelB);
  });
}

function dedupeProjects(items: Project[]) {
  const projects = new Map<string, Project>();

  for (const item of items) {
    const existing = projects.get(item.worktree);
    if (!existing) {
      projects.set(item.worktree, item);
      continue;
    }

    const mergedRelatedIds = [
      ...new Set([...existing.relatedIds, ...item.relatedIds]),
    ];
    const keepCurrent =
      item.isFavorite !== existing.isFavorite
        ? item.isFavorite
        : (item.updatedAt ?? 0) !== (existing.updatedAt ?? 0)
          ? (item.updatedAt ?? 0) > (existing.updatedAt ?? 0)
          : item.hasIcon !== existing.hasIcon
            ? item.hasIcon
            : item.sandboxCount > existing.sandboxCount;

    projects.set(
      item.worktree,
      keepCurrent
        ? {
            ...item,
            relatedIds: mergedRelatedIds,
            isFavorite: item.isFavorite || existing.isFavorite,
          }
        : {
            ...existing,
            relatedIds: mergedRelatedIds,
            isFavorite: existing.isFavorite || item.isFavorite,
          },
    );
  }

  return [...projects.values()];
}

function cachedIconPath(id: string) {
  const file = getIconManifest()[id];
  if (!file) return undefined;

  const fullPath = path.join(iconCacheDir(), file);
  if (existsSync(fullPath)) return fullPath;

  const manifest = { ...getIconManifest() };
  delete manifest[id];
  writeIconManifest(manifest);
  return undefined;
}

function dataUrlParts(input: string) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(input);
  if (!match) return undefined;
  return { mime: match[1], data: match[2] };
}

function iconExtension(mime: string) {
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/vnd.microsoft.icon" || mime === "image/x-icon")
    return "ico";
  return "img";
}

function iconMimeType(ext: string) {
  if (ext === "svg") return "image/svg+xml";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "ico") return "image/x-icon";
  return undefined;
}

function cacheIconFile(id: string, ext: string, data: Buffer) {
  const file = `${id}.${ext}`;
  const fullPath = path.join(iconCacheDir(), file);
  writeFileSync(fullPath, data);
  writeIconManifest({ ...getIconManifest(), [id]: file });
  return fullPath;
}

function storeCachedIcon(id: string, iconUrl: string) {
  const parsed = dataUrlParts(iconUrl);
  if (!parsed) return undefined;
  return cacheIconFile(
    id,
    iconExtension(parsed.mime),
    Buffer.from(parsed.data, "base64"),
  );
}

function discoverProjectIcon(worktree: string) {
  for (const ext of projectIconExtensions) {
    const codexCandidate = path.join(worktree, ".codex", `icon.${ext}`);
    if (existsSync(codexCandidate)) return codexCandidate;
  }
  return undefined;
}

function cacheProjectIcon(id: string, iconPath: string) {
  const ext = path.extname(iconPath).slice(1).toLowerCase() || "img";
  return cacheIconFile(id, ext, readFileSync(iconPath));
}

function projectIconDataUrl(iconPath: string) {
  const ext = path.extname(iconPath).slice(1).toLowerCase();
  const mime = iconMimeType(ext);
  if (!mime)
    throw new Error(`Unsupported icon file type: .${ext || "unknown"}`);
  return `data:${mime};base64,${readFileSync(iconPath).toString("base64")}`;
}

function parseTsv(input: string) {
  const lines = input.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  if (!header) return [] as Array<Record<string, string>>;

  const columns = header.split("\t");
  return rows.map((row) => {
    const values = row.split("\t");
    return Object.fromEntries(
      columns.map((column, index) => [column, values[index] ?? ""]),
    );
  });
}

function toProject(row: ProjectRow, favorites: Set<string>): Project {
  const relatedIds = [row.id];
  return {
    id: row.id,
    worktree: row.worktree,
    name: row.name || undefined,
    icon: cachedIconPath(row.id),
    iconColor: row.icon_color || undefined,
    tint: tint(row.icon_color),
    startupCommand: row.startup_command || undefined,
    sandboxCount: Number(row.sandbox_count) || 0,
    updatedAt: row.time_updated
      ? Number(row.time_updated) || undefined
      : undefined,
    hasIcon: Number(row.has_icon) > 0,
    isFavorite: isProjectFavorite(favorites, {
      id: row.id,
      worktree: row.worktree,
      relatedIds,
    }),
    relatedIds,
  };
}

function cachedProjectToProject(
  record: CachedProject,
  favorites: Set<string>,
): Project {
  const relatedIds = record.relatedIds?.length
    ? record.relatedIds
    : [record.id];
  return {
    id: record.id,
    worktree: record.worktree,
    name: record.name,
    icon: cachedIconPath(record.id),
    iconColor: record.iconColor,
    tint: tint(record.iconColor),
    startupCommand: record.startupCommand,
    sandboxCount: record.sandboxCount,
    updatedAt: record.updatedAt,
    hasIcon: record.hasIcon,
    isFavorite: isProjectFavorite(favorites, {
      id: record.id,
      worktree: record.worktree,
      relatedIds,
    }),
    relatedIds,
  };
}

export function readCachedProjects() {
  const favorites = getFavorites();
  return sortProjects(
    dedupeProjects(
      readProjectIndex().map((item) => cachedProjectToProject(item, favorites)),
    ),
  );
}

export async function loadProjects() {
  const favorites = getFavorites();
  const query = [
    "select id, worktree, name, icon_color, json_extract(commands, '$.start') as startup_command,",
    "time_updated, coalesce(json_array_length(sandboxes), 0) as sandbox_count,",
    "case when icon_url is not null and icon_url != '' then 1 else 0 end as has_icon",
    "from project",
    "where worktree != '/'",
    "order by coalesce(time_updated, 0) desc, coalesce(name, worktree) asc",
  ].join(" ");

  const { stdout } = await execFileAsync(
    codexPath(),
    ["db", query, "--format", "tsv"],
    {
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  const items = sortProjects(
    dedupeProjects(
      parseTsv(stdout)
        .filter((item): item is ProjectRow => Boolean(item.id && item.worktree))
        .map((item) => toProject(item, favorites)),
    ),
  );

  writeProjectIndex(items);
  return { items };
}

async function fetchRemoteIcons(items: Project[]) {
  const ids = items.map((item) => item.id);
  if (!ids.length) return new Map<string, string>();

  const query = [
    "select id, icon_url",
    "from project",
    `where id in (${ids.map(quote).join(", ")}) and icon_url is not null and icon_url != ''`,
  ].join(" ");

  const { stdout } = await execFileAsync(
    codexPath(),
    ["db", query, "--format", "tsv"],
    {
      maxBuffer: 1024 * 1024 * 8,
    },
  );

  return new Map(
    parseTsv(stdout)
      .filter((row) => row.id && row.icon_url)
      .map((row) => [row.id, row.icon_url]),
  );
}

function prioritizeHydration(items: Project[]) {
  return [...items].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    const timeA = a.updatedAt ?? 0;
    const timeB = b.updatedAt ?? 0;
    return timeB - timeA;
  });
}

async function hydrateIconBatch(items: Project[]) {
  const remotePending: Project[] = [];

  for (const item of items) {
    if (item.icon) continue;

    const cached = cachedIconPath(item.id);
    if (cached) {
      item.icon = cached;
      continue;
    }

    const projectIcon = discoverProjectIcon(item.worktree);
    if (projectIcon) {
      item.icon = cacheProjectIcon(item.id, projectIcon);
      continue;
    }

    if (item.hasIcon) remotePending.push(item);
  }

  if (!remotePending.length) return;

  const remoteIcons = await fetchRemoteIcons(remotePending);
  for (const item of remotePending) {
    const iconUrl = remoteIcons.get(item.id);
    if (iconUrl) item.icon = storeCachedIcon(item.id, iconUrl);
  }
}

export async function hydrateProjectIcons(
  items: Project[],
  onUpdate?: HydrationUpdate,
) {
  const next = items.map((item) => ({ ...item }));
  const pending = prioritizeHydration(next.filter((item) => !item.icon));
  if (!pending.length) return next;

  const priority = pending.slice(0, iconHydrationPriorityCount);
  const remainder = pending.slice(iconHydrationPriorityCount);

  if (priority.length) {
    await hydrateIconBatch(priority);
    onUpdate?.([...next]);
  }

  for (
    let index = 0;
    index < remainder.length;
    index += iconHydrationBatchSize
  ) {
    await hydrateIconBatch(
      remainder.slice(index, index + iconHydrationBatchSize),
    );
    onUpdate?.([...next]);
  }

  return next;
}

export function renameProjectInCache(
  items: Project[],
  project: Pick<Project, "worktree">,
  name?: string,
) {
  const nextName = name?.trim() || undefined;
  const next = sortProjects(
    items.map((item) =>
      item.worktree === project.worktree ? { ...item, name: nextName } : item,
    ),
  );
  writeProjectIndex(next);
  return next;
}

export function updateProjectInCache(
  items: Project[],
  project: Pick<Project, "worktree">,
  updates: Partial<Pick<Project, "name" | "iconColor" | "startupCommand">>,
) {
  const next = sortProjects(
    items.map((item) =>
      item.worktree === project.worktree
        ? {
            ...item,
            name: updates.name?.trim() || undefined,
            iconColor: updates.iconColor?.trim() || undefined,
            tint: tint(updates.iconColor),
            startupCommand: updates.startupCommand?.trim() || undefined,
          }
        : item,
    ),
  );

  writeProjectIndex(next);
  return next;
}

export function toggleFavoriteProject(
  items: Project[],
  project: Pick<Project, "id" | "worktree" | "relatedIds">,
) {
  const favorites = new Set(getFavorites());
  const key = project.worktree;
  const keysToClear = favoriteKeys(project);
  const alreadyFavorite = keysToClear.some((favoriteKey) =>
    favorites.has(favoriteKey),
  );

  for (const favoriteKey of keysToClear) favorites.delete(favoriteKey);
  if (!alreadyFavorite) favorites.add(key);

  writeFavorites(favorites);
  return sortProjects(
    items.map((item) =>
      item.worktree === project.worktree
        ? { ...item, isFavorite: isProjectFavorite(favorites, item) }
        : item,
    ),
  );
}

export function removeProjectFromCache(
  items: Project[],
  project: Pick<Project, "id" | "worktree">,
) {
  const favorites = new Set(getFavorites());
  const removed =
    favorites.delete(project.worktree) || favorites.delete(project.id);
  if (removed) writeFavorites(favorites);

  const next = items.filter((item) => item.worktree !== project.worktree);
  writeProjectIndex(next);
  return next;
}

export async function saveProjectIcon(
  items: Project[],
  project: Pick<Project, "id" | "worktree">,
  iconPath: string,
) {
  const ext = path.extname(iconPath).slice(1).toLowerCase();
  if (!projectIconExtensions.includes(ext)) {
    throw new Error("Use PNG, JPG, JPEG, SVG, GIF, WEBP, or ICO");
  }

  const query = [
    "update project",
    `set icon_url = ${quote(projectIconDataUrl(iconPath))}`,
    `where worktree = ${quote(project.worktree)}`,
  ].join(" ");

  await execFileAsync(codexPath(), ["db", query], {
    maxBuffer: 1024 * 1024 * 8,
  });

  const cachedIcon = cacheProjectIcon(project.id, iconPath);
  const next = items.map((item) =>
    item.worktree === project.worktree
      ? { ...item, icon: cachedIcon, hasIcon: true }
      : item,
  );
  writeProjectIndex(next);
  return next;
}
