import { readFile } from "fs/promises";
import path from "path";
import { parseDocDetail, type DocDetail } from "./doc-detail";
import { INVENTORY_URL, transformInventoryResponse, type InventoryItem } from "./inventory";

export type DocumentationSourceMode = "online" | "local";
export type ResolvedDocumentationSource = "remote" | "local";

interface LoaderDeps {
  fetchImpl: typeof fetch;
  readFileImpl: typeof readFile;
}

const defaultDeps: LoaderDeps = {
  fetchImpl: fetch,
  readFileImpl: readFile,
};

export interface LoadInventoryOptions {
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
  deps?: Partial<LoaderDeps>;
}

export interface LoadInventoryResult {
  data: InventoryItem[];
  source: ResolvedDocumentationSource;
  remoteError?: Error;
}

export interface LoadDocDetailOptions {
  item: InventoryItem;
  inventorySource?: ResolvedDocumentationSource;
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
  deps?: Partial<LoaderDeps>;
}

export interface LoadDocDetailResult {
  data: DocDetail;
  source: ResolvedDocumentationSource;
  remoteError?: Error;
}

export async function loadInventory(options: LoadInventoryOptions): Promise<LoadInventoryResult> {
  const deps = resolveDeps(options.deps);

  if (options.mode === "local") {
    return {
      data: await loadLocalInventory(options.localDocsDirectory, deps),
      source: "local",
    };
  }

  try {
    return {
      data: await loadRemoteInventory(deps),
      source: "remote",
    };
  } catch (error) {
    if (!options.localDocsDirectory) {
      throw error;
    }

    return {
      data: await loadLocalInventory(options.localDocsDirectory, deps),
      source: "local",
      remoteError: toError(error),
    };
  }
}

export async function loadDocDetail(options: LoadDocDetailOptions): Promise<LoadDocDetailResult> {
  const deps = resolveDeps(options.deps);

  if (options.mode === "local" || options.inventorySource === "local") {
    return {
      data: await loadLocalDocDetail(options.item, options.localDocsDirectory, deps),
      source: "local",
    };
  }

  try {
    return {
      data: await loadRemoteDocDetail(options.item, deps),
      source: "remote",
    };
  } catch (error) {
    if (!options.localDocsDirectory) {
      throw error;
    }

    return {
      data: await loadLocalDocDetail(options.item, options.localDocsDirectory, deps),
      source: "local",
      remoteError: toError(error),
    };
  }
}

async function loadRemoteInventory(deps: LoaderDeps): Promise<InventoryItem[]> {
  const response = await deps.fetchImpl(INVENTORY_URL);
  if (!response.ok) {
    throw new Error(`Failed to load Pandas inventory: ${response.status} ${response.statusText}`);
  }

  return transformInventoryResponse(await response.arrayBuffer());
}

async function loadLocalInventory(localDocsDirectory: string | undefined, deps: LoaderDeps): Promise<InventoryItem[]> {
  const directory = await getStableDocsDirectory(localDocsDirectory, deps);
  const buffer = await deps.readFileImpl(path.join(directory, "objects.inv"));
  return transformInventoryResponse(buffer);
}

async function loadRemoteDocDetail(item: InventoryItem, deps: LoaderDeps): Promise<DocDetail> {
  const response = await deps.fetchImpl(item.url);
  if (!response.ok) {
    throw new Error(`Failed to load documentation: ${response.status} ${response.statusText}`);
  }

  return parseDocDetail(await response.text(), item);
}

async function loadLocalDocDetail(item: InventoryItem, localDocsDirectory: string | undefined, deps: LoaderDeps) {
  const directory = await getStableDocsDirectory(localDocsDirectory, deps);
  const htmlPath = path.join(directory, getLocalDocPath(item));
  return parseDocDetail(await deps.readFileImpl(htmlPath, "utf-8"), item);
}

async function getStableDocsDirectory(localDocsDirectory: string | undefined, deps: LoaderDeps): Promise<string> {
  const directory = requireLocalDocsDirectory(localDocsDirectory);
  const stablePath = path.join(directory, "stable");

  try {
    const symlinkTarget = (await deps.readFileImpl(stablePath, "utf-8")).trim();
    if (symlinkTarget) {
      return path.resolve(directory, symlinkTarget);
    }
  } catch {
    // Most downloads have a real stable directory. Some Windows checkouts store
    // the stable symlink target in a plain text file instead.
  }

  return stablePath;
}

function getLocalDocPath(item: InventoryItem): string {
  return decodeURIComponent(item.docPath.split("#")[0] ?? item.docPath);
}

function requireLocalDocsDirectory(localDocsDirectory: string | undefined): string {
  if (!localDocsDirectory) {
    throw new Error("Set Local Docs Directory in command preferences to use downloaded Pandas documentation.");
  }

  return localDocsDirectory;
}

function resolveDeps(deps: Partial<LoaderDeps> | undefined): LoaderDeps {
  return {
    ...defaultDeps,
    ...deps,
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
