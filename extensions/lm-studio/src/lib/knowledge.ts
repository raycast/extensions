import { LocalStorage, environment } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const KNOWLEDGE_INDEX_VERSION = 1;
export const MAX_NOTE_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_KNOWLEDGE_CHUNKS = 5_000;
export const DEFAULT_SEARCH_LIMIT = 8;
export const MAX_SEARCH_LIMIT = 20;
export const DEFAULT_CHUNK_SIZE = 1_200;
export const DEFAULT_CHUNK_OVERLAP = 200;

const KNOWLEDGE_DIRECTORY = "knowledge";
const CATALOG_FILENAME = "catalog-v1.json";
const FOLDERS_STORAGE_KEY = "knowledge.folders.v1";
const MODEL_STORAGE_KEY = "knowledge.embedding-model.v1";
const ALLOWED_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

export type EmbeddingFunction = (texts: string[], model: string, signal?: AbortSignal) => Promise<number[][]>;

export type KnowledgeSource = {
  path: string;
  startLine: number;
  endLine: number;
};

export type KnowledgeChunk = {
  id: string;
  hash: string;
  text: string;
  embedding: number[];
  sources: KnowledgeSource[];
};

export type IndexedKnowledgeFile = {
  path: string;
  size: number;
  modifiedAt: number;
  contentHash: string;
  chunkHashes: string[];
};

export type KnowledgeIndex = {
  version: typeof KNOWLEDGE_INDEX_VERSION;
  id: string;
  model: string;
  dimension: number;
  createdAt: string;
  updatedAt: string;
  folders: string[];
  files: IndexedKnowledgeFile[];
  chunks: KnowledgeChunk[];
};

export type KnowledgeIndexSummary = Pick<
  KnowledgeIndex,
  "id" | "model" | "dimension" | "createdAt" | "updatedAt" | "folders"
> & {
  filename: string;
  fileCount: number;
  chunkCount: number;
};

type KnowledgeCatalog = {
  version: typeof KNOWLEDGE_INDEX_VERSION;
  indexes: KnowledgeIndexSummary[];
};

export type KnowledgeSettings = {
  folders: string[];
  embeddingModel?: string;
};

export type KnowledgeIndexProgress = {
  phase: "scanning" | "embedding" | "saving";
  completed: number;
  total: number;
  message: string;
};

export type KnowledgeIndexResult = {
  index: KnowledgeIndex;
  discoveredFileCount: number;
  skippedFileCount: number;
  embeddedChunkCount: number;
  reusedChunkCount: number;
  truncated: boolean;
};

export type KnowledgeSearchResult = {
  id: string;
  score: number;
  excerpt: string;
  path: string;
  startLine: number;
  endLine: number;
  sources: KnowledgeSource[];
};

export type BuildKnowledgeIndexOptions = {
  folders: string[];
  model: string;
  embed: EmbeddingFunction;
  signal?: AbortSignal;
  supportPath?: string;
  batchSize?: number;
  onProgress?: (progress: KnowledgeIndexProgress) => void;
};

export type SearchKnowledgeOptions = {
  model?: string;
  limit?: number;
  embed: EmbeddingFunction;
  signal?: AbortSignal;
  supportPath?: string;
};

type TextChunk = {
  text: string;
  startLine: number;
  endLine: number;
};

type PendingChunk = Omit<KnowledgeChunk, "embedding">;

type ScanResult = {
  files: IndexedKnowledgeFile[];
  chunks: PendingChunk[];
  discoveredFileCount: number;
  skippedFileCount: number;
  truncated: boolean;
};

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("The operation was cancelled.", "AbortError");
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeFolders(folders: string[]) {
  return [
    ...new Set(
      folders
        .map((folder) => folder.trim())
        .filter(Boolean)
        .map((folder) => path.resolve(folder)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function indexIdentifier(model: string, dimension: number) {
  return `${sha256(model).slice(0, 16)}-${dimension}`;
}

function getKnowledgeDirectory(supportPath = environment.supportPath) {
  return path.join(supportPath, KNOWLEDGE_DIRECTORY);
}

function getCatalogPath(supportPath?: string) {
  return path.join(getKnowledgeDirectory(supportPath), CATALOG_FILENAME);
}

function getIndexFilename(id: string) {
  return `index-v${KNOWLEDGE_INDEX_VERSION}-${id}.json`;
}

function getIndexPath(id: string, supportPath?: string) {
  return path.join(getKnowledgeDirectory(supportPath), getIndexFilename(id));
}

async function writeJsonAtomically(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function isKnowledgeIndex(value: unknown): value is KnowledgeIndex {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<KnowledgeIndex>;
  return (
    candidate.version === KNOWLEDGE_INDEX_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.model === "string" &&
    Number.isInteger(candidate.dimension) &&
    (candidate.dimension ?? -1) >= 0 &&
    Array.isArray(candidate.folders) &&
    Array.isArray(candidate.files) &&
    Array.isArray(candidate.chunks)
  );
}

async function readCatalog(supportPath?: string): Promise<KnowledgeCatalog> {
  const catalog = await readJson<KnowledgeCatalog>(getCatalogPath(supportPath));
  if (catalog?.version === KNOWLEDGE_INDEX_VERSION && Array.isArray(catalog.indexes)) return catalog;
  return { version: KNOWLEDGE_INDEX_VERSION, indexes: [] };
}

async function saveIndex(index: KnowledgeIndex, supportPath?: string) {
  const filename = getIndexFilename(index.id);
  await writeJsonAtomically(getIndexPath(index.id, supportPath), index);

  const catalog = await readCatalog(supportPath);
  const summary: KnowledgeIndexSummary = {
    id: index.id,
    filename,
    model: index.model,
    dimension: index.dimension,
    createdAt: index.createdAt,
    updatedAt: index.updatedAt,
    folders: index.folders,
    fileCount: index.files.length,
    chunkCount: index.chunks.length,
  };
  catalog.indexes = [summary, ...catalog.indexes.filter((entry) => entry.id !== index.id)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  await writeJsonAtomically(getCatalogPath(supportPath), catalog);
}

function lineNumberAt(newlineOffsets: number[], offset: number) {
  let low = 0;
  let high = newlineOffsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (newlineOffsets[middle] < offset) low = middle + 1;
    else high = middle;
  }
  return low + 1;
}

function findChunkBoundary(text: string, start: number, maximumEnd: number) {
  if (maximumEnd >= text.length) return text.length;
  const minimumEnd = start + Math.floor((maximumEnd - start) * 0.65);
  for (let cursor = maximumEnd; cursor >= minimumEnd; cursor -= 1) {
    const character = text[cursor];
    if (character === "\n" || character === " " || character === "\t") return cursor;
  }
  return maximumEnd;
}

/** Split note text deterministically while retaining line locations for citations. */
export function chunkText(input: string, options: { size?: number; overlap?: number } = {}): TextChunk[] {
  const size = Math.max(32, Math.floor(options.size ?? DEFAULT_CHUNK_SIZE));
  const overlap = Math.max(0, Math.min(Math.floor(options.overlap ?? DEFAULT_CHUNK_OVERLAP), size - 1));
  const text = input.replace(/\r\n?/g, "\n");
  const newlineOffsets: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) newlineOffsets.push(index);
  }
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    while (start < text.length && /\s/.test(text[start])) start += 1;
    if (start >= text.length) break;

    const maximumEnd = Math.min(start + size, text.length);
    const end = findChunkBoundary(text, start, maximumEnd);
    const rawChunk = text.slice(start, end);
    const trimmedEnd = rawChunk.trimEnd().length;
    const chunkEnd = start + trimmedEnd;
    const chunk = text.slice(start, chunkEnd);

    if (chunk) {
      chunks.push({
        text: chunk,
        startLine: lineNumberAt(newlineOffsets, start),
        endLine: lineNumberAt(newlineOffsets, Math.max(start, chunkEnd - 1)),
      });
    }

    if (end >= text.length) break;
    const nextStart = Math.max(start + 1, end - overlap);
    start = nextStart;
  }

  return chunks;
}

function addPendingChunk(map: Map<string, PendingChunk>, textChunk: TextChunk, filePath: string) {
  const hash = sha256(textChunk.text);
  const source: KnowledgeSource = {
    path: filePath,
    startLine: textChunk.startLine,
    endLine: textChunk.endLine,
  };
  const existing = map.get(hash);
  if (existing) {
    existing.sources.push(source);
  } else {
    map.set(hash, {
      id: hash.slice(0, 24),
      hash,
      text: textChunk.text,
      sources: [source],
    });
  }
  return hash;
}

function isWithinRoot(candidatePath: string, rootPath: string) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function discoverNotePaths(folders: string[], signal?: AbortSignal) {
  const discovered = new Map<string, string>();
  let skipped = 0;

  async function walk(directory: string, rootPath: string): Promise<void> {
    assertNotAborted(signal);
    let directoryPath: string;
    let entries: string[];
    try {
      // Do not trust a parent Dirent's cached type. Re-check the target before
      // every recursion so a symlinked directory is never traversed.
      const directoryStat = await lstat(directory);
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
        skipped += 1;
        return;
      }
      directoryPath = await realpath(directory);
      if (!isWithinRoot(directoryPath, rootPath)) {
        skipped += 1;
        return;
      }
      entries = await readdir(directoryPath);
    } catch {
      skipped += 1;
      return;
    }

    entries.sort((a, b) => a.localeCompare(b));
    for (const entryName of entries) {
      assertNotAborted(signal);
      if (entryName.startsWith(".")) continue;
      const entryPath = path.join(directoryPath, entryName);
      try {
        const entryStat = await lstat(entryPath);
        if (entryStat.isSymbolicLink()) continue;
        if (entryStat.isDirectory()) {
          await walk(entryPath, rootPath);
        } else if (entryStat.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entryName).toLowerCase())) {
          const filePath = await realpath(entryPath);
          if (isWithinRoot(filePath, rootPath)) {
            discovered.set(filePath, rootPath);
          } else {
            skipped += 1;
          }
        }
      } catch {
        skipped += 1;
      }
    }
  }

  for (const folder of folders) {
    assertNotAborted(signal);
    try {
      const folderStat = await lstat(folder);
      if (!folderStat.isDirectory() || folderStat.isSymbolicLink() || path.basename(folder).startsWith(".")) {
        skipped += 1;
        continue;
      }
      const rootPath = await realpath(folder);
      await walk(rootPath, rootPath);
    } catch {
      skipped += 1;
    }
  }

  return {
    paths: [...discovered]
      .map(([filePath, rootPath]) => ({ filePath, rootPath }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath)),
    skipped,
  };
}

async function scanKnowledge(
  folders: string[],
  signal?: AbortSignal,
  onProgress?: BuildKnowledgeIndexOptions["onProgress"],
): Promise<ScanResult> {
  const discovered = await discoverNotePaths(folders, signal);
  const chunks = new Map<string, PendingChunk>();
  const files: IndexedKnowledgeFile[] = [];
  let skippedFileCount = discovered.skipped;
  let truncated = false;

  for (let fileIndex = 0; fileIndex < discovered.paths.length; fileIndex += 1) {
    assertNotAborted(signal);
    const { filePath, rootPath } = discovered.paths[fileIndex];
    onProgress?.({
      phase: "scanning",
      completed: fileIndex,
      total: discovered.paths.length,
      message: `Scanning ${path.basename(filePath)}`,
    });

    try {
      const fileStat = await lstat(filePath);
      const resolvedFilePath = await realpath(filePath);
      if (
        !fileStat.isFile() ||
        fileStat.isSymbolicLink() ||
        resolvedFilePath !== filePath ||
        !isWithinRoot(resolvedFilePath, rootPath) ||
        fileStat.size > MAX_NOTE_FILE_BYTES
      ) {
        skippedFileCount += 1;
        continue;
      }
      const content = await readFile(resolvedFilePath, "utf8");
      const textChunks = chunkText(content);
      const chunkHashes: string[] = [];
      for (const textChunk of textChunks) {
        const hash = sha256(textChunk.text);
        if (!chunks.has(hash) && chunks.size >= MAX_KNOWLEDGE_CHUNKS) {
          truncated = true;
          continue;
        }
        addPendingChunk(chunks, textChunk, resolvedFilePath);
        chunkHashes.push(hash);
      }
      files.push({
        path: resolvedFilePath,
        size: fileStat.size,
        modifiedAt: fileStat.mtimeMs,
        contentHash: sha256(content),
        chunkHashes,
      });
    } catch {
      skippedFileCount += 1;
    }
  }

  onProgress?.({
    phase: "scanning",
    completed: discovered.paths.length,
    total: discovered.paths.length,
    message: `Found ${chunks.size.toLocaleString()} unique chunks`,
  });

  return {
    files,
    chunks: [...chunks.values()],
    discoveredFileCount: discovered.paths.length,
    skippedFileCount,
    truncated,
  };
}

function validateEmbedding(vector: number[], expectedDimension?: number) {
  if (!Array.isArray(vector) || vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("LM Studio returned an invalid embedding vector.");
  }
  if (expectedDimension !== undefined && vector.length !== expectedDimension) {
    throw new Error(`LM Studio returned embedding dimension ${vector.length}; expected ${expectedDimension}.`);
  }
}

async function findIndex(model: string, dimension: number | undefined, supportPath?: string) {
  const catalog = await readCatalog(supportPath);
  const summary = catalog.indexes.find(
    (entry) => entry.model === model && (dimension === undefined || entry.dimension === dimension),
  );
  if (!summary) return undefined;
  const candidate = await readJson<unknown>(path.join(getKnowledgeDirectory(supportPath), summary.filename));
  return isKnowledgeIndex(candidate) ? candidate : undefined;
}

export async function buildKnowledgeIndex(options: BuildKnowledgeIndexOptions): Promise<KnowledgeIndexResult> {
  const folders = normalizeFolders(options.folders);
  const model = options.model.trim();
  if (folders.length === 0) throw new Error("Choose at least one folder to index.");
  if (!model) throw new Error("Choose an embedding model.");
  assertNotAborted(options.signal);

  const scan = await scanKnowledge(folders, options.signal, options.onProgress);
  const now = new Date().toISOString();

  if (scan.chunks.length === 0) {
    const id = indexIdentifier(model, 0);
    const existing = await findIndex(model, 0, options.supportPath);
    const index: KnowledgeIndex = {
      version: KNOWLEDGE_INDEX_VERSION,
      id,
      model,
      dimension: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      folders,
      files: scan.files,
      chunks: [],
    };
    options.onProgress?.({
      phase: "saving",
      completed: 0,
      total: 0,
      message: "Saving empty index",
    });
    await saveIndex(index, options.supportPath);
    await setKnowledgeSettings({ folders, embeddingModel: model });
    return {
      index,
      discoveredFileCount: scan.discoveredFileCount,
      skippedFileCount: scan.skippedFileCount,
      embeddedChunkCount: 0,
      reusedChunkCount: 0,
      truncated: scan.truncated,
    };
  }

  options.onProgress?.({
    phase: "embedding",
    completed: 0,
    total: scan.chunks.length,
    message: "Checking embedding model",
  });
  const probe = await options.embed([scan.chunks[0].text], model, options.signal);
  if (probe.length !== 1) throw new Error("LM Studio did not return the expected embedding response.");
  validateEmbedding(probe[0]);
  const dimension = probe[0].length;
  const previous = await findIndex(model, dimension, options.supportPath);
  const reusableVectors = new Map(
    (previous?.chunks ?? [])
      .filter((chunk) => chunk.embedding.length === dimension && chunk.hash === sha256(chunk.text))
      .map((chunk) => [chunk.hash, chunk.embedding] as const),
  );
  const vectors = new Map<string, number[]>([[scan.chunks[0].hash, probe[0]]]);
  let embeddedChunkCount = 1;
  let reusedChunkCount = 0;

  for (const chunk of scan.chunks.slice(1)) {
    const reusable = reusableVectors.get(chunk.hash);
    if (reusable) {
      vectors.set(chunk.hash, reusable);
      reusedChunkCount += 1;
    }
  }

  const pending = scan.chunks.slice(1).filter((chunk) => !vectors.has(chunk.hash));
  const batchSize = Math.max(1, Math.min(128, Math.floor(options.batchSize ?? 32)));
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    assertNotAborted(options.signal);
    const batch = pending.slice(offset, offset + batchSize);
    options.onProgress?.({
      phase: "embedding",
      completed: Math.min(scan.chunks.length, embeddedChunkCount + reusedChunkCount),
      total: scan.chunks.length,
      message: `Embedding ${Math.min(offset + batch.length, pending.length).toLocaleString()} of ${pending.length.toLocaleString()} new chunks`,
    });
    const embeddings = await options.embed(
      batch.map((chunk) => chunk.text),
      model,
      options.signal,
    );
    if (embeddings.length !== batch.length) {
      throw new Error(`LM Studio returned ${embeddings.length} embeddings for a batch of ${batch.length}.`);
    }
    for (let index = 0; index < batch.length; index += 1) {
      validateEmbedding(embeddings[index], dimension);
      vectors.set(batch[index].hash, embeddings[index]);
      embeddedChunkCount += 1;
    }
  }

  const id = indexIdentifier(model, dimension);
  const chunks: KnowledgeChunk[] = scan.chunks.map((chunk) => ({
    ...chunk,
    embedding: vectors.get(chunk.hash) ?? [],
  }));
  const index: KnowledgeIndex = {
    version: KNOWLEDGE_INDEX_VERSION,
    id,
    model,
    dimension,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    folders,
    files: scan.files,
    chunks,
  };
  options.onProgress?.({
    phase: "saving",
    completed: chunks.length,
    total: chunks.length,
    message: "Saving note index",
  });
  await saveIndex(index, options.supportPath);
  await setKnowledgeSettings({ folders, embeddingModel: model });

  return {
    index,
    discoveredFileCount: scan.discoveredFileCount,
    skippedFileCount: scan.skippedFileCount,
    embeddedChunkCount,
    reusedChunkCount,
    truncated: scan.truncated,
  };
}

export async function loadKnowledgeIndex(options: { model?: string; supportPath?: string } = {}) {
  const model = options.model?.trim() || (await getKnowledgeSettings()).embeddingModel;
  if (!model) return undefined;
  return findIndex(model, undefined, options.supportPath);
}

/** Cosine similarity, returning -1 for vectors that cannot be compared. */
export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) return -1;
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return -1;
  return dotProduct / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function rankKnowledgeChunks(chunks: KnowledgeChunk[], queryEmbedding: number[], limit = DEFAULT_SEARCH_LIMIT) {
  const resultLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
  const validQuery = queryEmbedding.length > 0 && queryEmbedding.some((value) => value !== 0);
  if (!validQuery) return [];
  return chunks
    .filter((chunk) => chunk.embedding.length === queryEmbedding.length && chunk.embedding.some((value) => value !== 0))
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id))
    .slice(0, resultLimit);
}

export async function searchKnowledge(
  query: string,
  options: SearchKnowledgeOptions,
): Promise<KnowledgeSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const index = await loadKnowledgeIndex({
    model: options.model,
    supportPath: options.supportPath,
  });
  if (!index) throw new Error("No note index exists yet. Run Search Notes and index a folder first.");
  if (index.chunks.length === 0 || index.dimension === 0) return [];
  assertNotAborted(options.signal);
  const response = await options.embed([normalizedQuery], index.model, options.signal);
  if (response.length !== 1) throw new Error("LM Studio did not return a query embedding.");
  validateEmbedding(response[0], index.dimension);

  return rankKnowledgeChunks(index.chunks, response[0], options.limit).map(({ chunk, score }) => {
    const source = chunk.sources[0];
    return {
      id: chunk.id,
      score,
      excerpt: chunk.text,
      path: source.path,
      startLine: source.startLine,
      endLine: source.endLine,
      sources: chunk.sources,
    };
  });
}

export async function listKnowledgeIndexes(supportPath?: string) {
  return (await readCatalog(supportPath)).indexes;
}

export async function getKnowledgeSettings(): Promise<KnowledgeSettings> {
  const [foldersValue, embeddingModel] = await Promise.all([
    LocalStorage.getItem<string>(FOLDERS_STORAGE_KEY),
    LocalStorage.getItem<string>(MODEL_STORAGE_KEY),
  ]);
  let folders: string[] = [];
  if (foldersValue) {
    try {
      const candidate = JSON.parse(foldersValue) as unknown;
      if (Array.isArray(candidate))
        folders = candidate.filter((folder): folder is string => typeof folder === "string");
    } catch {
      folders = [];
    }
  }
  return {
    folders: normalizeFolders(folders),
    embeddingModel: embeddingModel?.trim() || undefined,
  };
}

export async function setKnowledgeSettings(settings: KnowledgeSettings) {
  const folders = normalizeFolders(settings.folders);
  await Promise.all([
    LocalStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders)),
    settings.embeddingModel?.trim()
      ? LocalStorage.setItem(MODEL_STORAGE_KEY, settings.embeddingModel.trim())
      : LocalStorage.removeItem(MODEL_STORAGE_KEY),
  ]);
}

export async function clearKnowledgeData(options: { supportPath?: string; clearSettings?: boolean } = {}) {
  await rm(getKnowledgeDirectory(options.supportPath), {
    recursive: true,
    force: true,
  });
  if (options.clearSettings !== false) {
    await Promise.all([LocalStorage.removeItem(FOLDERS_STORAGE_KEY), LocalStorage.removeItem(MODEL_STORAGE_KEY)]);
  }
}
