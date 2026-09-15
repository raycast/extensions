import { createHash } from "node:crypto";
import { access, readdir, rename, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExtensionPreferences } from "../preferences";
import { mergeAndRankResults } from "../lib/merge-results";
import { searchProviderWithFallback } from "../lib/provider-search";
import type { AcademicSettings } from "../lib/settings";
import { getEnabledProviders } from "../providers";
import type { SearchContext, WorkKind, WorkResult } from "../types";
import { analyzeDocument, createEmbedding } from "./analysis";
import { extractDocumentEvidence } from "./extract";
import { loadLocalIndex, saveLocalIndex } from "./storage";
import type { AnalysisInput, LocalDocument, LocalIndex } from "./types";
import { renderRenameTemplate, validateRenameCandidate } from "./validation";

const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "tex",
  "md",
  "doc",
  "docx",
  "rtf",
  "html",
  "xml",
]);

export type ScanOptions = {
  maxDocuments?: number;
  onProgress?: (message: string, processed: number, total: number) => void;
};

export async function scanLocalLibrary(
  settings: AcademicSettings,
  preferences: ExtensionPreferences,
  options: ScanOptions = {},
): Promise<LocalIndex> {
  const index = await loadLocalIndex();
  const { reachable, unreachable } = await classifyFolders(
    settings.localFolders,
  );
  const discovered = await discover(reachable);
  const previous = new Map(
    index.documents.map((document) => [document.path, document]),
  );
  const now = new Date().toISOString();
  const documents = discovered.map((file) => {
    const existing = previous.get(file.path);
    if (existing?.fingerprint === file.fingerprint) return existing;
    return {
      id: createHash("sha256").update(file.path).digest("hex").slice(0, 20),
      ...file,
      stage: "discovered" as const,
      discoveredAt: existing?.discoveredAt ?? now,
      updatedAt: now,
    };
  });
  for (const document of index.documents) {
    if (
      unreachable.some(
        (folder) =>
          document.path === folder || document.path.startsWith(`${folder}/`),
      ) &&
      !documents.some((candidate) => candidate.id === document.id)
    )
      documents.push(document);
  }
  if (!settings.enableExperimentalAnalysis) {
    for (const document of documents) {
      document.analysis = undefined;
      document.embedding = undefined;
      if (document.stage === "enriched")
        document.stage = document.validation?.safe ? "verified" : "review";
    }
  }
  index.folders = [...settings.localFolders];
  index.analysisEnabled = settings.enableExperimentalAnalysis;
  index.documents = documents;
  index.lastScanAt = now;
  await saveLocalIndex(index);

  const pending = documents.filter(
    (document) =>
      document.stage === "discovered" ||
      document.stage === "error" ||
      (settings.enableExperimentalAnalysis && !document.analysis),
  );
  const limit = Math.max(
    0,
    Math.min(options.maxDocuments ?? settings.documentsPerRun, pending.length),
  );
  for (let position = 0; position < limit; position += 1) {
    const document = pending[position];
    options.onProgress?.(`Indexing ${document.filename}`, position, limit);
    await processDocument(document, settings, preferences);
    await saveLocalIndex(index);
  }
  options.onProgress?.("Local index is up to date", limit, limit);
  return index;
}

export async function analyzeOneDocument(
  path: string,
  settings: AcademicSettings,
  preferences: ExtensionPreferences,
): Promise<LocalDocument> {
  const info = await stat(path);
  const document: LocalDocument = {
    id: createHash("sha256").update(path).digest("hex").slice(0, 20),
    path,
    filename: basename(path),
    extension: extname(path).slice(1).toLowerCase(),
    size: info.size,
    modifiedAt: info.mtimeMs,
    fingerprint: fingerprint(info.size, info.mtimeMs),
    stage: "discovered",
    discoveredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await processDocument(document, settings, preferences);
  const index = await loadLocalIndex();
  index.analysisEnabled = settings.enableExperimentalAnalysis;
  const existing = index.documents.findIndex(
    (item) => item.path === path || item.id === document.id,
  );
  if (existing >= 0) index.documents[existing] = document;
  else index.documents.unshift(document);
  await saveLocalIndex(index);
  return document;
}

async function processDocument(
  document: LocalDocument,
  settings: AcademicSettings,
  preferences: ExtensionPreferences,
): Promise<void> {
  try {
    const evidence = await extractDocumentEvidence(document.path);
    document.evidence = evidence;
    document.stage = "extracted";
    document.updatedAt = new Date().toISOString();

    const work = await resolveMetadata(
      evidence,
      document,
      settings,
      preferences,
    );
    if (work) {
      document.work = addLocalAccess(work, document.path);
      document.stage = "identified";
      document.validation = validateRenameCandidate(evidence, work);
      document.stage = document.validation.safe ? "verified" : "review";
      document.suggestedFilename = renderRenameTemplate(
        templateFor(work.kind, settings),
        work,
        document.extension,
      );
    } else {
      document.stage = "review";
    }

    if (settings.enableExperimentalAnalysis) {
      const input = analysisInput(document);
      document.analysis = await analyzeDocument(input, settings, preferences);
      document.embedding = await createEmbedding(
        input,
        document.analysis,
        settings,
      );
    } else {
      document.analysis = undefined;
      document.embedding = undefined;
    }
    // Keep the permanent index compact: evidence needed for auditing is retained,
    // while large extracted text is discarded after the summary and embedding exist.
    document.evidence = {
      ...evidence,
      ocrText: evidence.ocrText?.slice(0, 2_000),
      textSample: undefined,
    };
    if (document.validation?.safe && settings.enableExperimentalAnalysis)
      document.stage = "enriched";

    if (
      settings.renameMode === "automatic" &&
      document.validation?.safe &&
      document.suggestedFilename &&
      document.suggestedFilename !== document.filename
    ) {
      try {
        await renameDocument(document);
      } catch (error) {
        document.stage = "review";
        document.error = error instanceof Error ? error.message : String(error);
      }
    }
    if (document.stage !== "review") document.error = undefined;
  } catch (error) {
    document.stage = "error";
    document.error = error instanceof Error ? error.message : String(error);
  }
  document.updatedAt = new Date().toISOString();
}

async function resolveMetadata(
  evidence: NonNullable<LocalDocument["evidence"]>,
  document: LocalDocument,
  settings: AcademicSettings,
  preferences: ExtensionPreferences,
): Promise<WorkResult | undefined> {
  const inferredTitle =
    evidence.ocrTitle ||
    evidence.embeddedTitle ||
    filenameTitle(document.filename);
  const query = evidence.doi || evidence.isbn || inferredTitle;
  if (!query || query.length < 3) return undefined;
  const providers = getEnabledProviders(settings.metadataSources);
  if (!providers.length) return undefined;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 12_000);
  const context: SearchContext = {
    signal: controller.signal,
    contactEmail: preferences.contactEmail?.trim(),
    googleBooksApiKey: preferences.googleBooksApiKey?.trim(),
    semanticScholarApiKey: preferences.semanticScholarApiKey?.trim(),
    coreApiKey: preferences.coreApiKey?.trim(),
    fallbackQueries: [inferredTitle].filter(Boolean),
  };
  try {
    const settled = await Promise.allSettled(
      providers.map((provider) =>
        searchProviderWithFallback(provider, query, context),
      ),
    );
    const results = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const ranked = mergeAndRankResults(results, inferredTitle || query);
    return ranked[0];
  } finally {
    clearTimeout(deadline);
    controller.abort();
  }
}

async function discover(
  folders: string[],
): Promise<
  Array<
    Pick<
      LocalDocument,
      "path" | "filename" | "extension" | "size" | "modifiedAt" | "fingerprint"
    >
  >
> {
  const results: Array<
    Pick<
      LocalDocument,
      "path" | "filename" | "extension" | "size" | "modifiedAt" | "fingerprint"
    >
  > = [];
  const queue = [
    ...new Set(folders.map((folder) => folder.trim()).filter(Boolean)),
  ];
  const visited = new Set<string>();
  while (queue.length && results.length < 100_000) {
    const folder = queue.shift()!;
    if (visited.has(folder)) continue;
    visited.add(folder);
    let entries;
    try {
      entries = await readdir(folder, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        queue.push(path);
        continue;
      }
      const extension = extname(entry.name).slice(1).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
      try {
        const info = await stat(path);
        results.push({
          path,
          filename: entry.name,
          extension,
          size: info.size,
          modifiedAt: info.mtimeMs,
          fingerprint: fingerprint(info.size, info.mtimeMs),
        });
      } catch {
        // A file may disappear while a synced folder is being enumerated.
      }
    }
  }
  return results;
}

async function classifyFolders(
  folders: string[],
): Promise<{ reachable: string[]; unreachable: string[] }> {
  const reachable: string[] = [];
  const unreachable: string[] = [];
  for (const folder of [
    ...new Set(folders.map((value) => value.trim()).filter(Boolean)),
  ]) {
    try {
      const info = await stat(folder);
      if (info.isDirectory()) reachable.push(folder);
      else unreachable.push(folder);
    } catch {
      unreachable.push(folder);
    }
  }
  return { reachable, unreachable };
}

async function renameDocument(document: LocalDocument): Promise<void> {
  const destination = join(dirname(document.path), document.suggestedFilename!);
  let destinationExists = true;
  try {
    await access(destination);
  } catch {
    destinationExists = false;
  }
  if (destinationExists)
    throw new Error(
      "Rename blocked because the destination filename already exists",
    );
  const original = document.path;
  await rename(original, destination);
  document.renamedFrom = original;
  document.path = destination;
  document.filename = basename(destination);
  const info = await stat(destination);
  document.modifiedAt = info.mtimeMs;
  document.fingerprint = fingerprint(info.size, info.mtimeMs);
  if (document.work) {
    document.work = addLocalAccess(
      {
        ...document.work,
        accessLinks: document.work.accessLinks.filter(
          (link) => link.source !== "Local Library",
        ),
      },
      destination,
    );
  }
}

export async function applyVerifiedRename(id: string): Promise<LocalDocument> {
  const index = await loadLocalIndex();
  const document = index.documents.find((item) => item.id === id);
  if (!document) throw new Error("The indexed document no longer exists");
  if (!document.validation?.safe)
    throw new Error(
      "Rename blocked: identifier, metadata and OCR evidence do not all agree",
    );
  if (!document.suggestedFilename)
    throw new Error("No safe filename suggestion is available");
  await renameDocument(document);
  await saveLocalIndex(index);
  return document;
}

export async function undoDocumentRename(id: string): Promise<LocalDocument> {
  const index = await loadLocalIndex();
  const document = index.documents.find((item) => item.id === id);
  if (!document?.renamedFrom)
    throw new Error("No recorded rename can be undone");
  try {
    await access(document.renamedFrom);
    throw new Error("The original filename is already occupied");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "The original filename is already occupied"
    )
      throw error;
  }
  const current = document.path;
  await rename(current, document.renamedFrom);
  document.path = document.renamedFrom;
  document.filename = basename(document.renamedFrom);
  document.renamedFrom = current;
  const info = await stat(document.path);
  document.modifiedAt = info.mtimeMs;
  document.fingerprint = fingerprint(info.size, info.mtimeMs);
  document.updatedAt = new Date().toISOString();
  await saveLocalIndex(index);
  return document;
}

function addLocalAccess(work: WorkResult, path: string): WorkResult {
  const url = pathToFileURL(path).href;
  const existing = work.accessLinks.some((link) => link.url === url);
  return {
    ...work,
    sources: [...new Set([...work.sources, "Local Library"])],
    accessSources: [
      ...new Set([...(work.accessSources ?? []), "Local Library"]),
    ],
    accessLinks: existing
      ? work.accessLinks
      : [
          {
            label: "Open Local File",
            url,
            source: "Local Library",
            kind: "read",
            format: documentFormat(path),
          },
          ...work.accessLinks,
        ],
  };
}

function analysisInput(document: LocalDocument): AnalysisInput {
  return {
    title:
      document.work?.title ??
      document.evidence?.ocrTitle ??
      document.evidence?.embeddedTitle,
    authors:
      document.work?.authors ??
      document.evidence?.ocrAuthors ??
      document.evidence?.embeddedAuthors ??
      [],
    kind: document.work?.kind,
    abstract: document.work?.abstract,
    text: [document.evidence?.ocrText, document.evidence?.textSample]
      .filter(Boolean)
      .join("\n"),
    fingerprint: document.fingerprint,
  };
}

function templateFor(kind: WorkKind, settings: AcademicSettings): string {
  if (kind === "article") return settings.articleRenameTemplate;
  if (kind === "book") return settings.bookRenameTemplate;
  return settings.otherRenameTemplate;
}

function filenameTitle(filename: string): string {
  return basename(filename, extname(filename))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function documentFormat(path: string): string {
  return extname(path).slice(1).toUpperCase();
}

function fingerprint(size: number, modifiedAt: number): string {
  return createHash("sha256")
    .update(`${size}:${Math.round(modifiedAt)}`)
    .digest("hex")
    .slice(0, 24);
}

export async function searchLocalIndex(query: string): Promise<WorkResult[]> {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];
  const index = await loadLocalIndex();
  return index.documents
    .map((document) => ({ document, score: localScore(document, normalized) }))
    .filter(({ score }) => score > 0.16)
    .sort((left, right) => right.score - left.score)
    .slice(0, 30)
    .map(({ document }) => workForLocalDocument(document));
}

function workForLocalDocument(document: LocalDocument): WorkResult {
  if (document.work) return addLocalAccess(document.work, document.path);
  const title =
    document.evidence?.ocrTitle ||
    document.evidence?.embeddedTitle ||
    filenameTitle(document.filename);
  return {
    id: `local:${document.id}`,
    title,
    authors: document.evidence?.ocrAuthors.length
      ? document.evidence.ocrAuthors
      : (document.evidence?.embeddedAuthors ?? []),
    kind: "other",
    identifiers: {
      doi: document.evidence?.doi,
      isbn: document.evidence?.isbn ? [document.evidence.isbn] : undefined,
    },
    abstract: document.analysis?.summary,
    sources: ["Local Library"],
    metadataSources: ["Local Library"],
    accessSources: ["Local Library"],
    accessLinks: [
      {
        label: "Open Local File",
        url: pathToFileURL(document.path).href,
        source: "Local Library",
        kind: "read",
        format: documentFormat(document.path),
      },
    ],
  };
}

export async function findRelatedDocuments(
  id: string,
  limit = 20,
): Promise<Array<{ document: LocalDocument; score: number }>> {
  const index = await loadLocalIndex();
  const selected = index.documents.find((document) => document.id === id);
  if (!selected?.embedding) return [];
  return index.documents
    .filter(
      (document) =>
        document.id !== id &&
        document.embedding &&
        document.embedding.dimensions === selected.embedding!.dimensions &&
        document.embedding.model === selected.embedding!.model,
    )
    .map((document) => ({
      document,
      score: cosine(selected.embedding!, document.embedding!),
    }))
    .filter(({ score }) => score > 0.08)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function cosine(
  left: NonNullable<LocalDocument["embedding"]>,
  right: NonNullable<LocalDocument["embedding"]>,
): number {
  const a = Buffer.from(left.values, "base64");
  const b = Buffer.from(right.values, "base64");
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const av = (a[index] - 128) * left.scale;
    const bv = (b[index] - 128) * right.scale;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

function localScore(document: LocalDocument, query: string): number {
  const haystack = normalize(
    [
      document.filename,
      document.work?.title,
      document.work?.authors.join(" "),
      document.work?.abstract,
      document.analysis?.summary,
      document.analysis?.keywords.join(" "),
      document.analysis?.topics.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
  if (haystack.includes(query)) return 1;
  const requested = query.split(" ").filter(Boolean);
  return (
    requested.filter((token) => haystack.includes(token)).length /
    Math.max(1, requested.length)
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
