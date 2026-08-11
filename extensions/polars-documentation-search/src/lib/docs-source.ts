import fs from "fs/promises";
import path from "path";
import { INVENTORY_URL, transformInventoryResponse, type InventoryItem } from "./inventory";
import { parseDocDetail, type DocDetail } from "./doc-detail";

export type DocumentationSourceMode = "online" | "local";
export type ResolvedDocumentationSource = "remote" | "local";

interface LoaderDeps {
  fetchImpl: typeof fetch;
  readFileImpl: typeof fs.readFile;
}

const defaultDeps: LoaderDeps = {
  fetchImpl: fetch,
  readFileImpl: fs.readFile,
};

export interface SourcePreferences {
  documentationSource?: DocumentationSourceMode;
  localDocsDirectory?: string;
}

export interface LoadInventoryResult {
  items: InventoryItem[];
  source: ResolvedDocumentationSource;
  remoteError?: Error;
}

export interface LoadDocDetailResult {
  detail: DocDetail;
  source: ResolvedDocumentationSource;
  remoteError?: Error;
}

export function getDocumentationSourceMode(preferences: SourcePreferences): DocumentationSourceMode {
  return preferences.documentationSource ?? "online";
}

export async function loadInventory(
  preferences: SourcePreferences,
  deps: LoaderDeps = defaultDeps,
): Promise<LoadInventoryResult> {
  const mode = getDocumentationSourceMode(preferences);

  if (mode === "local") {
    return { items: await loadLocalInventory(preferences.localDocsDirectory, deps), source: "local" };
  }

  try {
    return { items: await loadRemoteInventory(deps), source: "remote" };
  } catch (error) {
    if (!preferences.localDocsDirectory) {
      throw error;
    }

    return {
      items: await loadLocalInventory(preferences.localDocsDirectory, deps),
      source: "local",
      remoteError: toError(error),
    };
  }
}

export async function loadDocDetail(
  item: InventoryItem,
  source: ResolvedDocumentationSource | undefined,
  preferences: SourcePreferences,
  deps: LoaderDeps = defaultDeps,
): Promise<LoadDocDetailResult> {
  const shouldLoadLocal = source === "local" || getDocumentationSourceMode(preferences) === "local";

  if (shouldLoadLocal) {
    return {
      detail: await loadLocalDocDetail(item, preferences.localDocsDirectory, deps),
      source: "local",
    };
  }

  try {
    return { detail: await loadRemoteDocDetail(item, deps), source: "remote" };
  } catch (error) {
    if (!preferences.localDocsDirectory) {
      throw error;
    }

    return {
      detail: await loadLocalDocDetail(item, preferences.localDocsDirectory, deps),
      source: "local",
      remoteError: toError(error),
    };
  }
}

async function loadRemoteInventory(deps: LoaderDeps): Promise<InventoryItem[]> {
  const response = await deps.fetchImpl(INVENTORY_URL);
  if (!response.ok) {
    throw new Error(`Failed to load Polars inventory: ${response.status} ${response.statusText}`);
  }

  return transformInventoryResponse(await response.arrayBuffer());
}

async function loadLocalInventory(localDocsDirectory: string | undefined, deps: LoaderDeps): Promise<InventoryItem[]> {
  const docsDirectory = await getStableDocsDirectory(localDocsDirectory, deps);
  const inventoryPath = resolveInside(docsDirectory, "objects.inv");
  const inventory = await deps.readFileImpl(inventoryPath);
  return transformInventoryResponse(toArrayBuffer(inventory));
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function loadRemoteDocDetail(item: InventoryItem, deps: LoaderDeps): Promise<DocDetail> {
  const response = await deps.fetchImpl(item.url);
  if (!response.ok) {
    throw new Error(`Failed to load documentation: ${response.status} ${response.statusText}`);
  }

  return parseDocDetail(await response.text(), item);
}

async function loadLocalDocDetail(
  item: InventoryItem,
  localDocsDirectory: string | undefined,
  deps: LoaderDeps,
): Promise<DocDetail> {
  const docsDirectory = await getStableDocsDirectory(localDocsDirectory, deps);
  const htmlPath = resolveDocPath(docsDirectory, item.docPath);
  const html = await deps.readFileImpl(htmlPath, "utf-8");
  return parseDocDetail(html, item);
}

async function getStableDocsDirectory(localDocsDirectory: string | undefined, deps: LoaderDeps): Promise<string> {
  const directory = requireLocalDocsDirectory(localDocsDirectory);
  const stablePath = resolveInside(directory, "stable");
  let symlinkTarget: string | undefined;

  try {
    symlinkTarget = (await deps.readFileImpl(stablePath, "utf-8")).trim();
  } catch {
    // Most downloads have a real stable directory. Windows Git checkouts can turn
    // a stable symlink into a text file containing the target directory name.
  }

  if (symlinkTarget) {
    return resolveInside(directory, symlinkTarget);
  }

  return stablePath;
}

function requireLocalDocsDirectory(localDocsDirectory: string | undefined): string {
  if (!localDocsDirectory?.trim()) {
    throw new Error("Set Local Docs Directory in command preferences to use downloaded Polars docs.");
  }

  return localDocsDirectory.trim();
}

function resolveDocPath(docsDirectory: string, docPath: string): string {
  const relativePath = docPath.split("#")[0] ?? docPath;
  return resolveInside(docsDirectory, relativePath);
}

function resolveInside(baseDirectory: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    throw new Error(`Invalid local docs path: ${relativePath}`);
  }

  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Invalid local docs path: ${relativePath}`);
  }

  const base = path.resolve(baseDirectory);
  const resolved = path.resolve(base, relativePath);
  const relative = path.relative(base, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Invalid local docs path: ${relativePath}`);
  }

  return resolved;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
