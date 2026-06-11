import { getAccessToken } from "../auth";
import { debug } from "../debug";

const BASE_URL = "https://api.frame.io/v4";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  display_name: string;
  storage_limit: number;
  storage_usage: number;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  account_id: string;
  workspace_id: string;
  root_folder_id: string;
  view_url?: string;
  created_at: string;
  updated_at: string;
}

export type AssetType = "file" | "folder" | "version_stack";
export type SearchResultType = "file" | "folder" | "version_stack" | "project";

export interface FolderAsset {
  id: string;
  type: "folder";
  name: string;
  account_id: string;
  project_id: string;
  parent_id: string | null;
  view_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RecentFile {
  file: FileAsset;
  projectName: string;
}

export interface MediaLink {
  url?: string;
  download_url?: string;
}

export interface MediaLinks {
  thumbnail?: MediaLink | null;
  thumbnail_high_quality?: MediaLink | null;
}

export interface FileAsset {
  id: string;
  type: "file";
  name: string;
  account_id: string;
  project_id: string;
  parent_id: string | null;
  file_size: number;
  media_type: string;
  status: "created" | "uploaded" | "transcoded";
  view_url: string;
  created_at: string;
  updated_at: string;
  adobe_version_id?: string | null;
  media_links?: MediaLinks;
}

export interface VersionStackAsset {
  id: string;
  type: "version_stack";
  name: string;
  account_id: string;
  project_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  view_url?: string | null;
  /** Version active — fournie par l'API dans la liste des enfants d'un dossier */
  head_version?: FileAsset | null;
}

export type Asset = FolderAsset | FileAsset | VersionStackAsset;

export interface FolderItem {
  asset: Asset;
  /** URL de la miniature, issue du champ media_links.thumbnail de l'API */
  thumbnailUrl?: string;
  /** Nombre de versions si l'item provient d'une version stack */
  versionCount?: number;
  /** ID de la version stack source (pour enrichissement async du compteur) */
  fromVersionStackId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: { next: string | null };
  total_count?: number | null;
}

export interface SearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  account_id: string;
  project_id?: string;
  parent_id?: string | null;
  root_folder_id?: string;
  view_url?: string;
  file_size?: number;
  media_type?: string;
  created_at: string;
  updated_at: string;
  matches?: Array<{ field: string; value: string }>;
}

export interface SearchResponse {
  data: SearchResult[];
  links: { next: string | null };
  total_count?: number | null;
}

export type SortOption =
  | "name"
  | "-name"
  | "updated_at"
  | "-updated_at"
  | "created_at"
  | "-created_at"
  | "file_size"
  | "-file_size";

// ─── HTTP helper ──────────────────────────────────────────────────────────────

interface ApiFetchOptions extends RequestInit {
  /** Ne pas logger d'erreur pour les 404/422 attendus (ex. ID version stack passé à /folders/) */
  silent?: boolean;
}

const MIN_REQUEST_INTERVAL_MS = 280;
let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { silent, ...fetchOptions } = options;
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const method = fetchOptions.method ?? "GET";
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await throttle();
    const start = Date.now();
    debug.api(method, path);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    const durationMs = Date.now() - start;

    if (response.status === 429 && attempt < maxAttempts) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const backoff = retryAfter > 0 ? retryAfter * 1000 : 800 * attempt;
      debug.info(`Rate limit 429 — nouvelle tentative dans ${backoff}ms (${attempt}/${maxAttempts})`);
      await sleep(backoff);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      const expectedFailure = silent && (response.status === 404 || response.status === 422);
      if (expectedFailure) {
        debug.api(method, path, response.status, durationMs);
      } else {
        debug.apiError(method, path, response.status, body);
      }
      throw new Error(`Frame.io API error ${response.status}: ${body}`);
    }

    debug.api(method, path, response.status, durationMs);
    return response.json() as Promise<T>;
  }

  throw new Error("Frame.io API error 429: Too Many Requests");
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function listAccounts(): Promise<Account[]> {
  const res = await apiFetch<PaginatedResponse<Account>>("/accounts");
  return res.data;
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export async function listWorkspaces(accountId: string): Promise<Workspace[]> {
  const res = await apiFetch<PaginatedResponse<Workspace>>(`/accounts/${accountId}/workspaces?page_size=100`);
  return res.data;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(accountId: string, workspaceId: string): Promise<Project[]> {
  const res = await apiFetch<PaginatedResponse<Project>>(
    `/accounts/${accountId}/workspaces/${workspaceId}/projects?page_size=100`
  );
  return res.data;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export interface ListFolderChildrenOptions {
  pageSize?: number;
  after?: string;
}

export async function listFolderChildren(
  accountId: string,
  folderId: string,
  options: ListFolderChildrenOptions = {}
): Promise<PaginatedResponse<Asset>> {
  const params = new URLSearchParams();
  params.set("page_size", String(options.pageSize ?? 50));
  params.set("include_total_count", "true");
  params.set("include", "media_links.thumbnail");
  if (options.after) params.set("after", options.after);

  const query = params.toString();
  return apiFetch<PaginatedResponse<Asset>>(`/accounts/${accountId}/folders/${folderId}/children?${query}`);
}

/** Liste les fichiers d'une version stack (endpoint dédié, pas /folders/) */
export async function listVersionStackChildren(
  accountId: string,
  stackId: string,
  options: { pageSize?: number } = {}
): Promise<PaginatedResponse<FileAsset>> {
  const params = new URLSearchParams();
  params.set("page_size", String(options.pageSize ?? 100));
  params.set("include_total_count", "true");
  params.set("include", "media_links.thumbnail");

  return apiFetch<PaginatedResponse<FileAsset>>(`/accounts/${accountId}/version_stacks/${stackId}/children?${params}`);
}

/**
 * Fusionne les version stacks dans leur fichier actif (head_version).
 * Les stacks n'apparaissent plus comme entrées séparées.
 */
export function buildFolderItems(raw: Asset[]): FolderItem[] {
  const stacks = raw.filter((a): a is VersionStackAsset => a.type === "version_stack");
  const headIdsFromStacks = new Set(stacks.map((s) => s.head_version?.id).filter((id): id is string => !!id));

  const items: FolderItem[] = [];

  for (const asset of raw) {
    if (asset.type === "folder") {
      items.push({ asset });
    } else if (asset.type === "version_stack") {
      const head = asset.head_version;
      if (head) {
        items.push({
          asset: head,
          thumbnailUrl: getThumbnailUrl(head),
          fromVersionStackId: asset.id,
        });
      }
    } else if (asset.type === "file") {
      if (headIdsFromStacks.has(asset.id)) continue;
      items.push({ asset, thumbnailUrl: getThumbnailUrl(asset) });
    }
  }

  return items;
}

/** Résout les stacks sans head_version et récupère le nombre de versions en arrière-plan */
export async function enrichVersionStacks(
  accountId: string,
  raw: Asset[]
): Promise<{ extraItems: FolderItem[]; counts: Record<string, number> }> {
  const stacks = raw.filter((a): a is VersionStackAsset => a.type === "version_stack");
  const counts: Record<string, number> = {};
  const extraItems: FolderItem[] = [];

  await Promise.all(
    stacks.map(async (stack) => {
      try {
        const res = await listVersionStackChildren(accountId, stack.id);
        const files = res.data;
        const count = res.total_count ?? files.length;
        counts[stack.id] = count;

        if (!stack.head_version && files.length > 0) {
          const head = files.reduce((latest, f) => (new Date(f.updated_at) > new Date(latest.updated_at) ? f : latest));
          extraItems.push({
            asset: head,
            thumbnailUrl: getThumbnailUrl(head),
            versionCount: count,
            fromVersionStackId: stack.id,
          });
          debug.info(`Version stack « ${stack.name} » → v${count} (${head.name})`);
        } else if (stack.head_version) {
          debug.info(`Version stack « ${stack.name} » → v${count} (${stack.head_version.name})`);
        }
      } catch (error) {
        debug.error(`Version stack ${stack.id}`, error);
      }
    })
  );

  return { extraItems, counts };
}

export function applyVersionCounts(items: FolderItem[], counts: Record<string, number>): FolderItem[] {
  return items.map((item) => {
    if (!item.fromVersionStackId || item.versionCount) return item;
    const count = counts[item.fromVersionStackId];
    return count && count > 1 ? { ...item, versionCount: count } : item;
  });
}

/** Tri côté client — l'endpoint /children ne supporte pas le paramètre sort en API stable v4 */
export function sortFolderItems(items: FolderItem[], sort: SortOption): FolderItem[] {
  const descending = sort.startsWith("-");
  const field = (descending ? sort.slice(1) : sort) as "name" | "updated_at" | "created_at" | "file_size";
  const direction = descending ? -1 : 1;

  return [...items].sort((a, b) => {
    const aFolder = a.asset.type === "folder";
    const bFolder = b.asset.type === "folder";
    if (aFolder !== bFolder) return aFolder ? -1 : 1;

    let cmp = 0;
    switch (field) {
      case "name":
        cmp = a.asset.name.localeCompare(b.asset.name, "fr", { sensitivity: "base" });
        break;
      case "updated_at":
        cmp = new Date(a.asset.updated_at).getTime() - new Date(b.asset.updated_at).getTime();
        break;
      case "created_at":
        cmp = new Date(a.asset.created_at).getTime() - new Date(b.asset.created_at).getTime();
        break;
      case "file_size": {
        const aSize = a.asset.type === "file" ? a.asset.file_size : 0;
        const bSize = b.asset.type === "file" ? b.asset.file_size : 0;
        cmp = aSize - bSize;
        break;
      }
    }
    return cmp * direction;
  });
}

export async function getFolder(accountId: string, folderId: string): Promise<FolderAsset> {
  const res = await apiFetch<{ data: FolderAsset }>(`/accounts/${accountId}/folders/${folderId}`);
  return res.data;
}

/** Root → target order, for building a navigation stack that supports back-to-parent. */
export async function buildFolderAncestorChain(accountId: string, folderId: string): Promise<FolderAsset[]> {
  const chain: FolderAsset[] = [];
  const seen = new Set<string>();
  let current = await getFolder(accountId, folderId);

  while (!seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    if (!current.parent_id || seen.has(current.parent_id)) break;
    current = await getFolder(accountId, current.parent_id);
  }

  return chain;
}

/** GET dossier sans logger d'erreur si l'ID n'est pas un dossier (ex. version stack) */
export async function tryGetFolder(accountId: string, folderId: string): Promise<FolderAsset | null> {
  try {
    const res = await apiFetch<{ data: FolderAsset }>(`/accounts/${accountId}/folders/${folderId}`, {
      silent: true,
    });
    return res.data;
  } catch {
    return null;
  }
}

export async function tryGetVersionStack(accountId: string, stackId: string): Promise<VersionStackAsset | null> {
  try {
    const res = await apiFetch<{ data: VersionStackAsset }>(`/accounts/${accountId}/version_stacks/${stackId}`, {
      silent: true,
    });
    return res.data;
  } catch {
    return null;
  }
}

/** URL navigateur fiable pour un dossier (évite les view_url qui pointent vers l'accueil) */
export function buildFolderBrowserUrl(folder: FolderAsset): string | undefined {
  const url = folder.view_url?.trim();
  if (url && !isFrameioHomeUrl(url)) return url;
  if (folder.project_id && folder.id) {
    return `https://next.frame.io/project/${folder.project_id}/${folder.id}`;
  }
  return url || undefined;
}

function isFrameioHomeUrl(url: string): boolean {
  return /frame\.io\/?$/.test(url) || /\/app\.frame\.io\/?$/.test(url) || /\/next\.frame\.io\/?$/.test(url);
}

const RECENT_UPLOADS_MAX_DEPTH = 1;
const RECENT_UPLOADS_MAX_FILES = 150;

function pushFileFromAsset(out: FileAsset[], item: Asset): void {
  if (item.type === "file") out.push(item);
  else if (item.type === "version_stack" && item.head_version) out.push(item.head_version);
}

async function collectFilesFromFolderLimited(
  accountId: string,
  folderId: string,
  out: FileAsset[],
  depth: number
): Promise<void> {
  if (out.length >= RECENT_UPLOADS_MAX_FILES) return;

  const res = await listFolderChildren(accountId, folderId, { pageSize: 40 });
  for (const item of res.data) {
    if (out.length >= RECENT_UPLOADS_MAX_FILES) return;
    if (item.type === "folder" && depth < RECENT_UPLOADS_MAX_DEPTH) {
      await collectFilesFromFolderLimited(accountId, item.id, out, depth + 1);
    } else {
      pushFileFromAsset(out, item);
    }
  }
}

function toRecentFiles(files: FileAsset[], projectNames: Record<string, string>, limit: number): RecentFile[] {
  return files
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map((file) => ({ file, projectName: projectNames[file.project_id] ?? "" }));
}

/** Scan séquentiel des projets avec rate limit + callbacks progressifs */
export async function streamRecentUploadsInWorkspace(
  accountId: string,
  workspaceId: string,
  limit = 30,
  onUpdate?: (files: RecentFile[], scanning: boolean) => void
): Promise<RecentFile[]> {
  const projects = await listProjects(accountId, workspaceId);
  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const collected: FileAsset[] = [];

  onUpdate?.([], true);

  for (const project of projects) {
    if (collected.length >= RECENT_UPLOADS_MAX_FILES) break;
    try {
      await collectFilesFromFolderLimited(accountId, project.root_folder_id, collected, 0);
      onUpdate?.(toRecentFiles(collected, projectNames, limit), true);
    } catch (error) {
      debug.error(`Scan projet « ${project.name} »`, error);
    }
  }

  const result = toRecentFiles(collected, projectNames, limit);
  debug.info(`${result.length} upload(s) récent(s) — ${projects.length} projet(s), workspace ${workspaceId}`);
  onUpdate?.(result, false);
  return result;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function getFile(accountId: string, fileId: string): Promise<FileAsset> {
  const params = new URLSearchParams();
  params.set("include", "media_links.thumbnail");
  const res = await apiFetch<{ data: FileAsset }>(`/accounts/${accountId}/files/${fileId}?${params}`);
  return res.data;
}

export async function getCommentCount(accountId: string, fileId: string): Promise<number> {
  const res = await apiFetch<{ total_count?: number | null }>(
    `/accounts/${accountId}/files/${fileId}/comments?page_size=1&include_total_count=true`
  );
  return res.total_count ?? 0;
}

/**
 * Fetch comment counts for multiple files, respecting rate limits (5 req/s for files).
 * Processes in batches of 5 with a short delay between batches.
 */
export async function getCommentCounts(accountId: string, fileIds: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  const BATCH_SIZE = 5;

  for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
    const batch = fileIds.slice(i, i + BATCH_SIZE);
    const counts = await Promise.all(
      batch.map(async (id) => {
        try {
          const count = await getCommentCount(accountId, id);
          return { id, count };
        } catch {
          return { id, count: 0 };
        }
      })
    );
    for (const { id, count } of counts) {
      results[id] = count;
    }
    // Small delay between batches to stay within rate limits
    if (i + BATCH_SIZE < fileIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return results;
}

// ─── Version Stacks (single) ──────────────────────────────────────────────────

export async function getVersionStack(accountId: string, stackId: string): Promise<VersionStackAsset> {
  const res = await apiFetch<{ data: VersionStackAsset }>(`/accounts/${accountId}/version_stacks/${stackId}`);
  return res.data;
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** Format brut renvoyé par l'API search — chaque item encapsule le résultat dans `result` */
interface RawAssetSearchItem {
  type: "file_result" | "folder_result" | "version_stack_result";
  matches?: unknown[];
  result: {
    id: string;
    type: "file" | "folder" | "version_stack";
    name: string;
    account_id: string;
    project_id: string;
    parent_id: string | null;
    view_url?: string;
    file_size?: number;
    media_type?: string;
    created_at: string;
    updated_at: string;
  };
}

interface RawProjectSearchItem {
  type: "project_result";
  matches?: unknown[];
  result: Project;
}

type RawSearchItem = RawAssetSearchItem | RawProjectSearchItem;

function normalizeSearchResults(items: RawSearchItem[], accountId: string): SearchResult[] {
  const results: SearchResult[] = [];

  for (const item of items) {
    if (item.type === "project_result") {
      const p = item.result;
      results.push({
        id: p.id,
        type: "project",
        name: p.name,
        account_id: accountId,
        project_id: p.id,
        parent_id: p.root_folder_id,
        view_url: p.view_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
        root_folder_id: p.root_folder_id,
      });
      continue;
    }

    if (item.type === "version_stack_result") continue;

    const r = item.result;
    results.push({
      id: r.id,
      type: item.type === "file_result" ? "file" : "folder",
      name: r.name,
      account_id: r.account_id,
      project_id: r.project_id,
      parent_id: r.parent_id,
      view_url: r.view_url,
      file_size: r.file_size,
      media_type: r.media_type,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  }

  return results;
}

export interface SearchOptions {
  query: string;
  accountId: string;
  engine?: "lexical" | "nlp";
  includeFiles?: boolean;
  includeFolders?: boolean;
  includeProjects?: boolean;
  pageSize?: number;
  after?: string;
}

export async function searchAccount(options: SearchOptions): Promise<SearchResponse> {
  const {
    query,
    accountId,
    engine = "lexical",
    includeFiles = true,
    includeFolders = true,
    includeProjects = true,
    pageSize = 50,
    after,
  } = options;

  const params = new URLSearchParams();
  params.set("page_size", String(pageSize));
  params.set("include_total_count", "true");
  if (after) params.set("after", after);

  const raw = await apiFetch<SearchResponse & { data: RawSearchItem[] }>(
    `/accounts/${accountId}/search?${params.toString()}`,
    {
      method: "POST",
      body: JSON.stringify({
        query,
        engine,
        filters: {
          files_and_version_stacks: includeFiles,
          folders: includeFolders,
          projects: includeProjects,
        },
      }),
    }
  );

  const data = normalizeSearchResults(raw.data ?? [], accountId);
  debug.info(`Recherche normalisée : ${(raw.data ?? []).length} brut → ${data.length} résultat(s)`);
  return { data, links: raw.links, total_count: raw.total_count };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getThumbnailUrl(file: FileAsset): string | undefined {
  return file.media_links?.thumbnail_high_quality?.url ?? file.media_links?.thumbnail?.url ?? undefined;
}

export function getAssetIcon(asset: Asset | SearchResult): string {
  if (asset.type === "folder") return "📁";
  if (asset.type === "version_stack") return "📚";
  if (asset.type === "project") return "🗂️";

  const mt = (asset as FileAsset).media_type ?? "";

  if (mt.startsWith("video/")) return "🎬";
  if (mt.startsWith("image/")) return "🖼️";
  if (mt.startsWith("audio/")) return "🎵";
  if (mt.includes("pdf")) return "📄";
  return "📄";
}
