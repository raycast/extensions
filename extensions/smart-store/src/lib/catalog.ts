import { environment } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const API_URL = "https://www.raycast.com/api/v1/store_listings";
const PAGE_SIZE = 300;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const CATALOG_FILE = path.join(environment.supportPath, "catalog.json");

export interface StoreCommand {
  name: string;
  title: string;
  subtitle?: string;
  description: string;
  keywords: string[];
  mode: string;
}

export interface StoreExtension {
  id: string;
  name: string;
  title: string;
  description: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  storeUrl: string;
  sourceUrl?: string;
  readmeUrl?: string;
  downloads: number;
  categories: string[];
  platforms: string[];
  icon?: string;
  iconDark?: string;
  commands: StoreCommand[];
  toolCount: number;
  hasMcp: boolean;
  createdAt: number;
  updatedAt: number;
  screenshots: string[];
}

interface CatalogFile {
  fetchedAt: number;
  items: StoreExtension[];
}

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API payload */
function toExtension(raw: any): StoreExtension {
  const sha: string | undefined = raw.commit_sha;
  const relativePath: string | undefined = raw.relative_path;
  const screenshotCount = Math.min(Number(raw.metadata_count) || 0, 3);
  const screenshots =
    sha && relativePath
      ? Array.from(
          { length: screenshotCount },
          (_, i) =>
            `https://raw.githubusercontent.com/raycast/extensions/${sha}/${relativePath.replace(/\/+$/, "")}/metadata/${raw.name}-${i + 1}.png`,
        )
      : [];

  return {
    id: raw.id,
    name: raw.name,
    title: raw.title ?? raw.name,
    description: raw.description ?? "",
    authorName: raw.author?.name ?? raw.author?.handle ?? "",
    authorHandle: raw.author?.handle ?? "",
    authorAvatar: raw.author?.avatar ?? undefined,
    storeUrl: raw.store_url,
    sourceUrl: raw.source_url ?? undefined,
    readmeUrl: raw.readme_url ?? undefined,
    downloads: Number(raw.download_count) || 0,
    categories: raw.categories ?? [],
    platforms: raw.platforms ?? [],
    icon: raw.icons?.light ?? undefined,
    iconDark: raw.icons?.dark ?? undefined,
    commands: (raw.commands ?? []).map((c: any) => ({
      name: c.name,
      title: c.title,
      subtitle: c.subtitle ?? undefined,
      description: c.description ?? "",
      keywords: c.keywords ?? [],
      mode: c.mode,
    })),
    toolCount: Array.isArray(raw.tools) ? raw.tools.length : 0,
    hasMcp: Boolean(raw.has_mcp),
    createdAt: Number(raw.created_at) || 0,
    updatedAt: Number(raw.updated_at) || 0,
    screenshots,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchPage(page: number): Promise<StoreExtension[]> {
  const response = await fetch(`${API_URL}?page=${page}&per_page=${PAGE_SIZE}`);
  if (!response.ok) throw new Error(`Raycast Store returned ${response.status}`);
  const json = (await response.json()) as { data?: unknown[] };
  return (json.data ?? []).map(toExtension);
}

export async function downloadCatalog(): Promise<StoreExtension[]> {
  const byId = new Map<string, StoreExtension>();
  const batchSize = 4;
  for (let start = 1; start < 100; start += batchSize) {
    const pages = await Promise.all(Array.from({ length: batchSize }, (_, i) => fetchPage(start + i)));
    for (const page of pages) for (const item of page) byId.set(item.id, item);
    if (pages.some((page) => page.length < PAGE_SIZE)) break;
  }
  return [...byId.values()].filter((item) => item.storeUrl);
}

async function readCatalogFile(): Promise<CatalogFile | undefined> {
  try {
    return JSON.parse(await fs.promises.readFile(CATALOG_FILE, "utf8")) as CatalogFile;
  } catch {
    return undefined;
  }
}

async function writeCatalogFile(data: CatalogFile) {
  await fs.promises.mkdir(environment.supportPath, { recursive: true });
  await fs.promises.writeFile(CATALOG_FILE, JSON.stringify(data));
}

export function useCatalog() {
  const [items, setItems] = useState<StoreExtension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setIsLoading(true);
    try {
      const fresh = await downloadCatalog();
      setItems(fresh);
      setError(undefined);
      await writeCatalogFile({ fetchedAt: Date.now(), items: fresh });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      refreshing.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const cached = await readCatalogFile();
      if (cached?.items?.length) setItems(cached.items);
      if (!cached || Date.now() - cached.fetchedAt > MAX_AGE_MS) await refresh();
      else setIsLoading(false);
    })();
  }, [refresh]);

  return { items, isLoading, error, refresh };
}

/**
 * Config folder of the running Raycast build, derived from its bundle id in the support path:
 * com.raycast.macos → raycast, com.raycast-x.macos.internal → raycast-x-internal.
 */
function raycastConfigDirName(): string {
  const bundleId = environment.supportPath.split(path.sep).find((segment) => segment.startsWith("com.raycast"));
  const [, app, , variant] = bundleId?.split(".") ?? [];
  if (!app) return "raycast";
  return variant ? `${app}-${variant}` : app;
}

/** Installed store extensions live in ~/.config/<raycast build>/extensions/<store id>. */
export function getInstalledIds(): Set<string> {
  try {
    return new Set(fs.readdirSync(path.join(os.homedir(), ".config", raycastConfigDirName(), "extensions")));
  } catch {
    return new Set();
  }
}

export function deeplinkFor(item: StoreExtension): string {
  const slug = new URL(item.storeUrl).pathname.replace(/^\/+/, "");
  return `raycast://extensions/${slug}?source=webstore`;
}
