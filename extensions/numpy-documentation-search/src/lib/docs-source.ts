import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDocDetail, type DocDetail } from "./doc-detail";
import { INVENTORY_URL, transformInventoryBuffer, type InventoryItem } from "./inventory";

export type DocumentationSourceMode = "online" | "local";
export type ResolvedDocumentationSource = "remote" | "local";

export interface InventoryLoadOptions {
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
}

export interface InventoryLoadResult {
  data: InventoryItem[];
  remoteError?: Error;
  source: ResolvedDocumentationSource;
}

export interface DocDetailLoadOptions {
  inventorySource: ResolvedDocumentationSource;
  item: InventoryItem;
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
}

export interface DocDetailLoadResult {
  data?: DocDetail;
  remoteError?: Error;
  source: ResolvedDocumentationSource;
}

interface LoaderDeps {
  fetchImpl: typeof fetch;
  readBinaryFileImpl: (filePath: string) => Promise<Buffer>;
  readTextFileImpl: (filePath: string) => Promise<string>;
}

const defaultDeps: LoaderDeps = {
  fetchImpl: fetch,
  readBinaryFileImpl: async (filePath) => Buffer.from(await readFile(filePath)),
  readTextFileImpl: async (filePath) => readFile(filePath, "utf8"),
};

export async function loadInventory(
  options: InventoryLoadOptions,
  deps: LoaderDeps = defaultDeps,
): Promise<InventoryLoadResult> {
  switch (options.mode) {
    case "local":
      return {
        data: await loadInventoryFromDirectory(options.localDocsDirectory, deps),
        source: "local",
      };
    case "online":
    default:
      try {
        return {
          data: await loadRemoteInventory(deps),
          source: "remote",
        };
      } catch (remoteError) {
        const normalizedRemoteError = toError(remoteError);

        if (options.localDocsDirectory) {
          try {
            return {
              data: await loadInventoryFromDirectory(options.localDocsDirectory, deps),
              remoteError: normalizedRemoteError,
              source: "local",
            };
          } catch (localError) {
            throw toError(localError);
          }
        }
        throw normalizedRemoteError;
      }
  }
}

export async function loadDocDetail(
  options: DocDetailLoadOptions,
  deps: LoaderDeps = defaultDeps,
): Promise<DocDetailLoadResult> {
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
  } catch (remoteError) {
    const normalizedRemoteError = toError(remoteError);

    if (options.localDocsDirectory) {
      try {
        return {
          data: await loadLocalDocDetail(options.item, options.localDocsDirectory, deps),
          remoteError: normalizedRemoteError,
          source: "local",
        };
      } catch {
        // Preserve the remote error below.
      }
    }

    throw normalizedRemoteError;
  }
}

async function loadRemoteInventory(deps: LoaderDeps): Promise<InventoryItem[]> {
  const response = await deps.fetchImpl(INVENTORY_URL);
  if (!response.ok) {
    throw new Error(`Failed to load NumPy inventory: ${response.status} ${response.statusText}`);
  }

  return transformInventoryBuffer(Buffer.from(await response.arrayBuffer()));
}

async function loadInventoryFromDirectory(
  localDocsDirectory: string | undefined,
  deps: LoaderDeps,
): Promise<InventoryItem[]> {
  const directory = getStableDocsDirectory(localDocsDirectory);
  return loadInventoryFromFile(path.join(directory, "objects.inv"), deps);
}

async function loadInventoryFromFile(filePath: string, deps: LoaderDeps): Promise<InventoryItem[]> {
  return transformInventoryBuffer(await deps.readBinaryFileImpl(filePath));
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
  const directory = getStableDocsDirectory(localDocsDirectory);
  const htmlPath = path.join(directory, item.docPath.split("#")[0] ?? item.docPath);
  return parseDocDetail(await deps.readTextFileImpl(htmlPath), item);
}

function getStableDocsDirectory(localDocsDirectory: string | undefined): string {
  return path.join(requireLocalDocsDirectory(localDocsDirectory), "stable");
}

function requireLocalDocsDirectory(localDocsDirectory: string | undefined): string {
  const normalized = localDocsDirectory?.trim();
  if (!normalized) {
    throw new Error("Set the Local Docs Directory preference to the downloaded NumPy docs folder.");
  }

  return normalized;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}
