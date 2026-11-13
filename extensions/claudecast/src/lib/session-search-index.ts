import fs from "fs";
import path from "path";
import { createHash, randomBytes } from "crypto";
import { pathToFileURL } from "url";
import type {
  SessionInboxMetadata,
  SessionSourceDescriptor,
} from "./session-inbox";

const INDEX_VERSION = 3;
const MANIFEST_FILE = "manifest.json";
const CORPUS_FILE = "corpus.txt";
const LOCK_FILE = "index.lock";
const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 50;
const LOCK_TIMEOUT_MS = 15_000;
const READ_CHUNK_BYTES = 64 * 1024;
const MAX_JSONL_LINE_BYTES = 2 * 1024 * 1024;
const MAX_SEGMENT_CHARS = 128 * 1024;
const MAX_QUERY_CHARS = 512;
const MAX_MATCHES = 100;
const MAX_MENTIONED_FILES = 50;
const MAX_MENTION_LENGTH = 1_000;
const FINGERPRINT_SAMPLE_BYTES = 4 * 1024;
const DEFAULT_CONTEXT_BEFORE = 3;
const DEFAULT_CONTEXT_AFTER = 3;
const MAX_CONTEXT_MESSAGES = 15;
const MAX_CONTEXT_CONTENT_CHARS = 8_000;
const MAX_INLINE_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export type SearchIndexPhase =
  | "Initial Indexing"
  | "Updating Index"
  | "Searching";

export interface SearchIndexStatus {
  phase: SearchIndexPhase;
  processedFiles: number;
  totalFiles: number;
  changedFiles: number;
}

export interface SearchIndexSource {
  filePath: string;
  sourceProjectDir: string;
  projectPath: string;
  projectName: string;
  mtimeMs: number;
  size: number;
  inbox?: SessionInboxMetadata;
}

export interface SearchIndexSegment {
  offset: number;
  length: number;
  sourceStart: number;
  sourceEnd: number;
  recordIndex: number;
  messageIndex?: number;
  stableMessageId: string;
  role: "user" | "assistant" | "summary";
}

export interface IndexedSessionFile {
  sourcePath: string;
  sourceProjectDir: string;
  projectPath: string;
  projectName: string;
  sessionId: string;
  mtimeMs: number;
  size: number;
  indexedBytes: number;
  sourceFingerprint: string;
  supplementalFingerprint: string;
  segments: SearchIndexSegment[];
  summary: string;
  firstMessage: string;
  turnCount: number;
  recordCount: number;
  model?: string;
  permissionMode?: string;
  mentionedFiles: string[];
  title?: string;
  entrypoint?: string;
  gitBranch?: string;
  workspacePath?: string;
  archived: boolean;
  sources: SessionSourceDescriptor[];
  desktopLocalSessionId?: string;
  desktopBridgeId?: string;
  conductorWorkspaceId?: string;
}

export interface SearchIndexManifest {
  version: number;
  committedCorpusBytes: number;
  files: Record<string, IndexedSessionFile>;
}

export interface SearchIndexHit {
  session: IndexedSessionFile;
  matchSnippet: string;
  match: SearchIndexMatch;
}

export interface SearchIndexMatch {
  stableMessageId: string;
  sourceStart: number;
  sourceEnd: number;
  recordIndex: number;
  messageIndex?: number;
  role: "user" | "assistant" | "summary";
  query?: string;
}

export interface SearchContextMessage {
  type: "user" | "assistant" | "summary";
  content: string;
  stableMessageId: string;
  sourceStart: number;
  sourceEnd: number;
  recordIndex: number;
  messageIndex?: number;
  matched: boolean;
  referencedFiles: string[];
  imagePaths: string[];
}

export interface SearchMatchContext {
  messages: SearchContextMessage[];
  totalMessageCount: number;
  matchedMessageIndex?: number;
  referencedFiles: string[];
  imagePaths: string[];
}

export interface SearchMatchContextOptions {
  allowedRoots: string[];
  projectPath: string;
  platform?: NodeJS.Platform;
  signal?: AbortSignal;
  before?: number;
  after?: number;
  maxContentChars?: number;
}

export interface SearchIndexTestHooks {
  onTranscriptRead?: (filePath: string, start: number) => void;
  afterCorpusAppend?: () => void | Promise<void>;
}

export interface SearchIndexOptions {
  platform?: NodeJS.Platform;
  signal?: AbortSignal;
  onStatus?: (status: SearchIndexStatus) => void;
  testHooks?: SearchIndexTestHooks;
}

interface ParsedQuery {
  content: string;
  directory?: string;
}

interface MutableMetadata {
  sessionId: string;
  summary: string;
  firstMessage: string;
  turnCount: number;
  model?: string;
  permissionMode?: string;
  mentionedFiles: string[];
  title?: string;
  entrypoint?: string;
  gitBranch?: string;
}

interface CompleteLine {
  bytes: Uint8Array | null;
  sourceStart: number;
  sourceEnd: number;
  truncated: boolean;
}

interface EntryMatch {
  text: string;
  segment: SearchIndexSegment;
}

interface PendingSearchContextMessage extends SearchContextMessage {
  candidatePaths: string[];
}

export class SearchIndexAbortError extends Error {
  constructor() {
    super("Session indexing was cancelled");
    this.name = "AbortError";
  }
}

export function getSearchPathIdentity(
  inputPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const resolved = pathApi.resolve(inputPath);
  return platform === "win32" ? resolved.toLocaleLowerCase() : resolved;
}

export function parseSessionSearchQuery(query: string): ParsedQuery {
  let directory: string | undefined;
  const content = query
    .replace(
      /(?:^|\s)(?:dir|project):(?:"([^"]+)"|'([^']+)'|([^\s]+))/gi,
      (_match, doubleQuoted, singleQuoted, unquoted) => {
        if (!directory) {
          directory = String(
            doubleQuoted ?? singleQuoted ?? unquoted ?? "",
          ).trim();
        }
        return " ";
      },
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_CHARS);

  return { content, directory: directory || undefined };
}

export async function updateSessionSearchIndex(
  indexDirectory: string,
  sources: SearchIndexSource[],
  options: SearchIndexOptions = {},
): Promise<SearchIndexManifest> {
  await fs.promises.mkdir(indexDirectory, { recursive: true, mode: 0o700 });
  return withIndexLock(indexDirectory, options.signal, async () => {
    assertNotAborted(options.signal);

    const manifestPath = path.join(indexDirectory, MANIFEST_FILE);
    const corpusPath = path.join(indexDirectory, CORPUS_FILE);
    let manifest = await readManifest(manifestPath);
    let initialIndex = Object.keys(manifest.files).length === 0;

    const corpusReady = await reconcileCorpus(corpusPath, manifest);
    if (!corpusReady) {
      manifest = emptyManifest();
      initialIndex = true;
      await atomicReplaceFile(corpusPath, new Uint8Array());
    }

    const platform = options.platform ?? process.platform;
    const sourceMap = deduplicateSources(sources, platform);
    const currentIdentities = new Set(sourceMap.keys());
    const removedCount = Object.keys(manifest.files).filter(
      (identity) => !currentIdentities.has(identity),
    ).length;
    const phase: SearchIndexPhase = initialIndex
      ? "Initial Indexing"
      : "Updating Index";
    let processedFiles = 0;
    let changedFiles = removedCount;

    options.onStatus?.({
      phase,
      processedFiles,
      totalFiles: sourceMap.size,
      changedFiles,
    });

    const nextFiles: Record<string, IndexedSessionFile> = {};
    let corpusOffset = manifest.committedCorpusBytes;
    const corpusHandle = await fs.promises.open(corpusPath, "a+");

    try {
      const orderedSources = [...sourceMap.entries()].sort((left, right) =>
        left[0].localeCompare(right[0]),
      );

      for (const [identity, source] of orderedSources) {
        assertNotAborted(options.signal);
        const previous = manifest.files[identity];
        const updateMode = await chooseUpdateMode(source, previous, options);

        if (updateMode === "unchanged" && previous) {
          nextFiles[identity] = previous;
        } else {
          changedFiles++;
          const base = updateMode === "append" ? previous : undefined;
          const result = await indexSourceFile(
            source,
            base,
            corpusHandle,
            corpusOffset,
            options,
          );
          nextFiles[identity] = result.entry;
          corpusOffset = result.corpusOffset;
        }

        processedFiles++;
        options.onStatus?.({
          phase,
          processedFiles,
          totalFiles: sourceMap.size,
          changedFiles,
        });
      }

      await corpusHandle.sync();
      if (corpusOffset > manifest.committedCorpusBytes) {
        await options.testHooks?.afterCorpusAppend?.();
      }
    } finally {
      await corpusHandle.close();
    }

    assertNotAborted(options.signal);
    const nextManifest: SearchIndexManifest = {
      version: INDEX_VERSION,
      committedCorpusBytes: corpusOffset,
      files: nextFiles,
    };
    await atomicWriteJson(manifestPath, nextManifest);
    return nextManifest;
  });
}

export async function searchSessionIndex(
  indexDirectory: string,
  query: string,
  onMatch: (hit: SearchIndexHit) => void,
  options: SearchIndexOptions = {},
): Promise<number> {
  assertNotAborted(options.signal);
  const manifest = await readManifest(path.join(indexDirectory, MANIFEST_FILE));
  const parsed = parseSessionSearchQuery(query);
  const needle = parsed.content.toLocaleLowerCase();
  const directoryNeedle = parsed.directory?.toLocaleLowerCase();
  const entries = Object.values(manifest.files).sort(
    (left, right) =>
      right.mtimeMs - left.mtimeMs ||
      left.sourcePath.localeCompare(right.sourcePath),
  );

  options.onStatus?.({
    phase: "Searching",
    processedFiles: 0,
    totalFiles: entries.length,
    changedFiles: 0,
  });

  let count = 0;
  let processedFiles = 0;
  const corpusPath = path.join(indexDirectory, CORPUS_FILE);
  let corpusHandle: fs.promises.FileHandle | undefined;

  try {
    corpusHandle = await fs.promises.open(corpusPath, "r");
    for (const entry of entries) {
      assertNotAborted(options.signal);
      processedFiles++;
      if (!matchesDirectory(entry, directoryNeedle)) {
        options.onStatus?.({
          phase: "Searching",
          processedFiles,
          totalFiles: entries.length,
          changedFiles: 0,
        });
        continue;
      }

      const found = needle
        ? await findEntryMatch(corpusHandle, entry, needle, options.signal)
        : firstIndexedLocation(entry);
      if (found !== null) {
        onMatch({
          session: entry,
          matchSnippet: needle
            ? buildMatchSnippet(found.text, parsed.content)
            : safeTextSlice(found.text, 300),
          match: segmentToMatch(found.segment, parsed.content || undefined),
        });
        count++;
        if (count >= MAX_MATCHES) break;
      }

      options.onStatus?.({
        phase: "Searching",
        processedFiles,
        totalFiles: entries.length,
        changedFiles: 0,
      });
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  } finally {
    await corpusHandle?.close();
  }

  return count;
}

export async function readSessionSearchManifest(
  indexDirectory: string,
): Promise<SearchIndexManifest> {
  return readManifest(path.join(indexDirectory, MANIFEST_FILE));
}

export async function readSessionMatchContext(
  sourcePath: string,
  match: SearchIndexMatch,
  options: SearchMatchContextOptions,
): Promise<SearchMatchContext> {
  const platform = options.platform ?? process.platform;
  const readableSource = await validateExistingLocalFile(
    sourcePath,
    options.allowedRoots,
    platform,
  );
  if (!readableSource) {
    throw new Error("Session Transcript Is Outside the Allowed Roots");
  }

  const stat = await fs.promises.stat(readableSource);
  const before = Math.max(
    0,
    Math.min(
      options.before ?? DEFAULT_CONTEXT_BEFORE,
      MAX_CONTEXT_MESSAGES - 1,
    ),
  );
  const after = Math.max(
    0,
    Math.min(
      options.after ?? DEFAULT_CONTEXT_AFTER,
      MAX_CONTEXT_MESSAGES - before - 1,
    ),
  );
  const maxContentChars = Math.max(
    1,
    Math.min(
      options.maxContentChars ?? MAX_CONTEXT_CONTENT_CHARS,
      MAX_CONTEXT_CONTENT_CHARS,
    ),
  );
  const preceding: PendingSearchContextMessage[] = [];
  const selected: PendingSearchContextMessage[] = [];
  let found = false;
  let remainingAfter = after;
  let recordIndex = 0;
  let messageIndex = 0;
  let totalMessageCount = 0;

  for await (const line of readCompleteLines(
    readableSource,
    0,
    stat.size,
    options.signal,
  )) {
    assertNotAborted(options.signal);
    if (line.truncated || !line.bytes) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder("utf-8").decode(line.bytes));
    } catch {
      continue;
    }
    if (!isObject(raw)) continue;

    const currentRecordIndex = recordIndex++;
    const type = typeof raw.type === "string" ? raw.type : "";
    const message = isObject(raw.message) ? raw.message : undefined;
    const stableMessageId =
      privateStableMessageId(raw.uuid) ??
      privateStableMessageId(message?.id) ??
      `byte:${line.sourceStart.toString(36)}`;
    let content = "";
    let role: SearchContextMessage["type"] | undefined;
    let currentMessageIndex: number | undefined;
    if (type === "summary" && typeof raw.summary === "string") {
      content = stripAnsiSequences(sanitizeString(raw.summary));
      role = "summary";
    } else if (type === "user" || type === "human") {
      content =
        cleanIndexedUserMessage(
          stripAnsiSequences(extractMessageText(message?.content)),
        ) || "";
      role = "user";
      currentMessageIndex = messageIndex++;
      totalMessageCount++;
    } else if (type === "assistant") {
      content = stripAnsiSequences(extractMessageText(message?.content));
      role = "assistant";
      currentMessageIndex = messageIndex++;
      totalMessageCount++;
    }
    if (!role || !content.trim()) continue;

    const candidatePaths = collectContextPathCandidates(
      raw,
      content,
      MAX_MENTIONED_FILES,
    );
    const isMatch =
      line.sourceStart === match.sourceStart &&
      currentRecordIndex === match.recordIndex;
    const contextMessage: PendingSearchContextMessage = {
      type: role,
      content: boundedContextContent(
        content,
        maxContentChars,
        isMatch ? match.query : undefined,
      ),
      stableMessageId,
      sourceStart: line.sourceStart,
      sourceEnd: line.sourceEnd,
      recordIndex: currentRecordIndex,
      messageIndex: currentMessageIndex,
      matched: false,
      referencedFiles: [],
      imagePaths: [],
      candidatePaths,
    };

    if (!found && isMatch) {
      found = true;
      contextMessage.matched = true;
      selected.push(...preceding, contextMessage);
    } else if (!found) {
      preceding.push(contextMessage);
      if (preceding.length > before) preceding.shift();
    } else if (remainingAfter > 0) {
      selected.push(contextMessage);
      remainingAfter--;
    }
  }

  if (!found) {
    throw new Error("Matched Session Message Is No Longer Available");
  }
  const allReferenced = new Set<string>();
  const allImages = new Set<string>();
  for (const message of selected) {
    for (const candidate of message.candidatePaths) {
      assertNotAborted(options.signal);
      const filePath = await resolveValidatedReferencedFile(
        candidate,
        options.projectPath,
        options.allowedRoots,
        platform,
      );
      if (!filePath || message.referencedFiles.includes(filePath)) continue;
      message.referencedFiles.push(filePath);
      allReferenced.add(filePath);
      if (
        IMAGE_EXTENSIONS.has(
          nativePathApi(platform).extname(filePath).toLowerCase(),
        ) &&
        (await isBoundedImage(filePath))
      ) {
        message.imagePaths.push(filePath);
        allImages.add(filePath);
      }
    }
  }
  return {
    messages: selected.map(({ candidatePaths, ...message }) => {
      void candidatePaths;
      return message;
    }),
    totalMessageCount,
    matchedMessageIndex: match.messageIndex,
    referencedFiles: [...allReferenced],
    imagePaths: [...allImages],
  };
}

export function isPathWithinAllowedRoots(
  candidate: string,
  allowedRoots: string[],
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (!isAbsoluteNativePath(candidate, platform)) return false;
  const candidateIdentity = nativePathIdentity(candidate, platform);
  const separator = platform === "win32" ? "\\" : "/";
  return allowedRoots.some((root) => {
    if (!isAbsoluteNativePath(root, platform)) return false;
    const rootIdentity = nativePathIdentity(root, platform);
    return (
      candidateIdentity === rootIdentity ||
      candidateIdentity.startsWith(
        rootIdentity.endsWith(separator)
          ? rootIdentity
          : `${rootIdentity}${separator}`,
      )
    );
  });
}

function deduplicateSources(
  sources: SearchIndexSource[],
  platform: NodeJS.Platform,
): Map<string, SearchIndexSource> {
  const result = new Map<string, SearchIndexSource>();
  for (const source of [...sources].sort((left, right) =>
    left.filePath.localeCompare(right.filePath),
  )) {
    const identity = getSearchPathIdentity(source.filePath, platform);
    if (!result.has(identity)) result.set(identity, source);
  }
  return result;
}

async function chooseUpdateMode(
  source: SearchIndexSource,
  previous: IndexedSessionFile | undefined,
  options: SearchIndexOptions,
): Promise<"unchanged" | "append" | "rewrite"> {
  if (!previous) return "rewrite";
  if (
    previous.sourceProjectDir !== source.sourceProjectDir ||
    previous.projectPath !== source.projectPath ||
    previous.projectName !== source.projectName
  ) {
    return "rewrite";
  }
  if (previous.supplementalFingerprint !== inboxFingerprint(source.inbox)) {
    return "rewrite";
  }
  if (
    previous.mtimeMs === source.mtimeMs &&
    previous.size === source.size &&
    previous.indexedBytes === source.size
  ) {
    return "unchanged";
  }
  if (
    source.size > previous.size &&
    previous.indexedBytes > 0 &&
    previous.indexedBytes <= source.size
  ) {
    const fingerprint = await fingerprintSourcePrefix(
      source.filePath,
      previous.indexedBytes,
      options,
    );
    if (fingerprint === previous.sourceFingerprint) return "append";
  }
  if (
    previous.indexedBytes < source.size &&
    previous.size === source.size &&
    previous.mtimeMs === source.mtimeMs
  ) {
    return "append";
  }
  return "rewrite";
}

async function indexSourceFile(
  source: SearchIndexSource,
  previous: IndexedSessionFile | undefined,
  corpusHandle: fs.promises.FileHandle,
  initialCorpusOffset: number,
  options: SearchIndexOptions,
): Promise<{ entry: IndexedSessionFile; corpusOffset: number }> {
  const start = previous?.indexedBytes ?? 0;
  const inbox = normalizeSessionInboxMetadata(source.inbox);
  const metadata: MutableMetadata = previous
    ? {
        sessionId: previous.sessionId,
        summary: previous.summary,
        firstMessage: previous.firstMessage,
        turnCount: previous.turnCount,
        model: previous.model,
        permissionMode: previous.permissionMode,
        mentionedFiles: [...previous.mentionedFiles],
        title: previous.title,
        entrypoint: previous.entrypoint,
        gitBranch: previous.gitBranch,
      }
    : {
        sessionId: path.basename(source.filePath, ".jsonl"),
        summary: "",
        firstMessage: "",
        turnCount: 0,
        mentionedFiles: [],
      };
  const segments = previous ? [...previous.segments] : [];
  const mentionedIdentities = new Set(
    metadata.mentionedFiles.map((filePath) => mentionedPathIdentity(filePath)),
  );
  let indexedBytes = start;
  let corpusOffset = initialCorpusOffset;
  let recordIndex = previous?.recordCount ?? 0;

  const appendText = async (
    value: string,
    location: Omit<SearchIndexSegment, "offset" | "length">,
  ) => {
    const text = sanitizeString(value).split("\u0000").join(" ");
    if (!text.trim()) return;
    let cursor = 0;
    while (cursor < text.length) {
      const chunk = text.slice(cursor, cursor + MAX_SEGMENT_CHARS);
      const buffer = new TextEncoder().encode(chunk);
      await corpusHandle.write(buffer, 0, buffer.length, null);
      segments.push({
        offset: corpusOffset,
        length: buffer.length,
        ...location,
      });
      corpusOffset += buffer.length;
      cursor += chunk.length;
    }
  };

  options.testHooks?.onTranscriptRead?.(source.filePath, start);
  for await (const line of readCompleteLines(
    source.filePath,
    start,
    source.size,
    options.signal,
  )) {
    assertNotAborted(options.signal);
    if (line.truncated) {
      indexedBytes = line.sourceEnd;
      continue;
    }
    if (!line.bytes) continue;

    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder("utf-8").decode(line.bytes));
    } catch {
      continue;
    }
    if (!isObject(raw)) continue;

    indexedBytes = line.sourceEnd;
    const currentRecordIndex = recordIndex++;
    const type = typeof raw.type === "string" ? raw.type : "";
    const message = isObject(raw.message) ? raw.message : undefined;
    const rawStableId =
      privateStableMessageId(raw.uuid) ?? privateStableMessageId(message?.id);
    const stableMessageId =
      rawStableId ?? `byte:${line.sourceStart.toString(36)}`;
    if (type === "summary") {
      if (typeof raw.summary === "string") {
        metadata.summary = safeTextSlice(sanitizeString(raw.summary), 500);
        await appendText(raw.summary, {
          sourceStart: line.sourceStart,
          sourceEnd: line.sourceEnd,
          recordIndex: currentRecordIndex,
          stableMessageId,
          role: "summary",
        });
      }
      const leafUuid = privateStableMessageId(raw.leafUuid);
      if (leafUuid) {
        metadata.sessionId = leafUuid;
      }
    }

    const content = stripAnsiSequences(extractMessageText(message?.content));
    let messageIndex: number | undefined;
    let role: "user" | "assistant" | undefined;
    if (type === "user" || type === "human") {
      messageIndex = metadata.turnCount;
      role = "user";
      metadata.turnCount++;
      if (!metadata.firstMessage && content) {
        const cleaned = cleanIndexedUserMessage(content);
        if (cleaned) metadata.firstMessage = safeTextSlice(cleaned, 200);
      }
      if (!metadata.permissionMode && typeof raw.permissionMode === "string") {
        metadata.permissionMode = safeTextSlice(raw.permissionMode, 100);
      }
    } else if (type === "assistant") {
      messageIndex = metadata.turnCount;
      role = "assistant";
      metadata.turnCount++;
    }

    const searchableContent =
      role === "user" ? cleanIndexedUserMessage(content) || "" : content;
    if (searchableContent && role) {
      await appendText(searchableContent, {
        sourceStart: line.sourceStart,
        sourceEnd: line.sourceEnd,
        recordIndex: currentRecordIndex,
        messageIndex,
        stableMessageId,
        role,
      });
      collectMentionedPaths(
        searchableContent,
        source.projectPath,
        metadata.mentionedFiles,
        mentionedIdentities,
      );
    }
    collectToolPaths(
      message?.content,
      source.projectPath,
      metadata.mentionedFiles,
      mentionedIdentities,
    );

    const model =
      typeof message?.model === "string"
        ? message.model
        : typeof raw.model === "string"
          ? raw.model
          : undefined;
    if (model) metadata.model = safeTextSlice(model, 200);

    const customTitle = privateMetadataString(raw.customTitle, 500);
    if (customTitle) metadata.title = customTitle;
    const entrypoint = privateMetadataString(raw.entrypoint, 100);
    if (entrypoint) metadata.entrypoint = entrypoint;
    const gitBranch = privateMetadataString(raw.gitBranch, 500);
    if (gitBranch) metadata.gitBranch = gitBranch;
  }

  const sourceFingerprint = await fingerprintSourcePrefix(
    source.filePath,
    indexedBytes,
    options,
  );
  return {
    entry: {
      sourcePath: source.filePath,
      sourceProjectDir: source.sourceProjectDir,
      projectPath: source.projectPath,
      projectName: source.projectName,
      sessionId: metadata.sessionId,
      mtimeMs: source.mtimeMs,
      size: source.size,
      indexedBytes,
      sourceFingerprint,
      supplementalFingerprint: inboxFingerprint(inbox),
      segments,
      summary: metadata.summary,
      firstMessage: metadata.firstMessage,
      turnCount: metadata.turnCount,
      recordCount: recordIndex,
      model: metadata.model,
      permissionMode: metadata.permissionMode,
      mentionedFiles: metadata.mentionedFiles,
      title: metadata.title ?? inbox?.title,
      entrypoint: metadata.entrypoint,
      gitBranch: metadata.gitBranch,
      workspacePath: inbox?.workspacePath ?? source.projectPath,
      archived: inbox?.archived ?? false,
      sources: addEntrypointSource(
        inbox?.sources ?? [
          { backend: "claude-cli", nativePath: source.filePath },
        ],
        metadata.entrypoint,
        source.filePath,
      ),
      desktopLocalSessionId: inbox?.desktopLocalSessionId,
      desktopBridgeId: inbox?.desktopBridgeId,
      conductorWorkspaceId: inbox?.conductorWorkspaceId,
    },
    corpusOffset,
  };
}

async function* readCompleteLines(
  filePath: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): AsyncGenerator<CompleteLine> {
  const handle = await fs.promises.open(filePath, "r");
  let position = start;
  let lineStart = start;
  let chunks: Uint8Array[] = [];
  let lineBytes = 0;
  let truncated = false;

  try {
    while (position < end) {
      assertNotAborted(signal);
      const buffer = new Uint8Array(Math.min(READ_CHUNK_BYTES, end - position));
      const { bytesRead } = await handle.read(
        buffer,
        0,
        buffer.length,
        position,
      );
      if (bytesRead === 0) break;
      const data = buffer.subarray(0, bytesRead);
      let chunkStart = 0;

      for (let index = 0; index < data.length; index++) {
        if (data[index] !== 0x0a) continue;
        const part = data.subarray(chunkStart, index);
        if (!truncated && part.length > 0) {
          chunks.push(part);
          lineBytes += part.length;
          if (lineBytes > MAX_JSONL_LINE_BYTES) {
            chunks = [];
            truncated = true;
          }
        }
        let bytes = truncated ? null : concatenateBytes(chunks, lineBytes);
        if (bytes?.at(-1) === 0x0d) bytes = bytes.subarray(0, -1);
        const sourceEnd = position + index + 1;
        yield { bytes, sourceStart: lineStart, sourceEnd, truncated };
        lineStart = sourceEnd;
        chunks = [];
        lineBytes = 0;
        truncated = false;
        chunkStart = index + 1;
      }

      const tail = data.subarray(chunkStart);
      if (!truncated && tail.length > 0) {
        chunks.push(tail);
        lineBytes += tail.length;
        if (lineBytes > MAX_JSONL_LINE_BYTES) {
          chunks = [];
          truncated = true;
        }
      }
      position += bytesRead;
    }

    if (position > lineStart) {
      const bytes = truncated ? null : concatenateBytes(chunks, lineBytes);
      if (truncated) {
        yield {
          bytes: null,
          sourceStart: lineStart,
          sourceEnd: position,
          truncated: true,
        };
      } else if (bytes && isCompleteJson(bytes)) {
        yield {
          bytes,
          sourceStart: lineStart,
          sourceEnd: position,
          truncated: false,
        };
      }
    }
  } finally {
    await handle.close();
  }
}

function isCompleteJson(bytes: Uint8Array): boolean {
  try {
    JSON.parse(new TextDecoder("utf-8").decode(bytes));
    return true;
  } catch {
    return false;
  }
}

async function fingerprintSourcePrefix(
  filePath: string,
  length: number,
  options: SearchIndexOptions,
): Promise<string> {
  if (length <= 0) return "";
  options.testHooks?.onTranscriptRead?.(filePath, 0);
  const handle = await fs.promises.open(filePath, "r");
  const hash = createHash("sha256");
  try {
    const firstLength = Math.min(length, FINGERPRINT_SAMPLE_BYTES);
    const first = new Uint8Array(firstLength);
    const firstRead = await handle.read(first, 0, first.length, 0);
    hash.update(first.subarray(0, firstRead.bytesRead));
    if (length > firstLength) {
      const tailLength = Math.min(
        length - firstLength,
        FINGERPRINT_SAMPLE_BYTES,
      );
      const tail = new Uint8Array(tailLength);
      const tailRead = await handle.read(
        tail,
        0,
        tail.length,
        length - tailLength,
      );
      hash.update(tail.subarray(0, tailRead.bytesRead));
    }
    hash.update(String(length));
    return hash.digest("hex");
  } finally {
    await handle.close();
  }
}

async function findEntryMatch(
  corpusHandle: fs.promises.FileHandle,
  entry: IndexedSessionFile,
  needle: string,
  signal?: AbortSignal,
): Promise<EntryMatch | null> {
  for (const segment of entry.segments) {
    assertNotAborted(signal);
    if (
      segment.offset < 0 ||
      segment.length <= 0 ||
      segment.offset + segment.length < segment.offset
    ) {
      continue;
    }
    const buffer = new Uint8Array(segment.length);
    const { bytesRead } = await corpusHandle.read(
      buffer,
      0,
      segment.length,
      segment.offset,
    );
    const text = new TextDecoder("utf-8").decode(buffer.subarray(0, bytesRead));
    if (text.toLocaleLowerCase().includes(needle)) return { text, segment };
  }
  return null;
}

function firstIndexedLocation(entry: IndexedSessionFile): EntryMatch | null {
  const segment = entry.segments[0];
  if (!segment) return null;
  return {
    text: entry.firstMessage || entry.summary || entry.sessionId,
    segment,
  };
}

function segmentToMatch(
  segment: SearchIndexSegment,
  query?: string,
): SearchIndexMatch {
  return {
    stableMessageId: segment.stableMessageId,
    sourceStart: segment.sourceStart,
    sourceEnd: segment.sourceEnd,
    recordIndex: segment.recordIndex,
    messageIndex: segment.messageIndex,
    role: segment.role,
    query,
  };
}

function matchesDirectory(
  entry: IndexedSessionFile,
  directoryNeedle: string | undefined,
): boolean {
  if (!directoryNeedle) return true;
  return [entry.projectName, entry.projectPath, entry.sourceProjectDir].some(
    (value) => value.toLocaleLowerCase().includes(directoryNeedle),
  );
}

function buildMatchSnippet(text: string, query: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return "";
  const start = Math.max(0, index - 120);
  const end = Math.min(normalized.length, index + query.length + 120);
  const before = normalized.slice(start, index);
  const match = normalized.slice(index, index + query.length);
  const after = normalized.slice(index + query.length, end);
  return safeTextSlice(
    `${start > 0 ? "..." : ""}${before}**${match}**${after}${
      end < normalized.length ? "..." : ""
    }`,
    300,
  );
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return sanitizeString(content);
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block): block is Record<string, unknown> =>
        isObject(block) &&
        block.type === "text" &&
        typeof block.text === "string",
    )
    .map((block) => sanitizeString(String(block.text)))
    .join("\n");
}

export function localImageMarkdownUrl(filePath: string): string {
  return pathToFileURL(filePath).toString();
}

function collectContextPathCandidates(
  raw: Record<string, unknown>,
  content: string,
  limit: number,
): string[] {
  const candidates: string[] = [];
  const add = (value: string) => {
    const trimmed = value.trim();
    if (
      trimmed &&
      trimmed.length <= MAX_MENTION_LENGTH &&
      !candidates.includes(trimmed) &&
      candidates.length < limit
    ) {
      candidates.push(trimmed);
    }
  };
  for (const marker of content.matchAll(/\[Image: source: ([^\]\r\n]+)\]/g)) {
    add(marker[1]);
  }
  for (const quoted of content.matchAll(/`([^`\r\n]{1,1000})`/g)) {
    add(quoted[1]);
  }
  for (const absolute of content.matchAll(
    /(?:^|[\s("'])([A-Za-z]:\\[^\s"'`]+|\\\\[^\s"'`]+|\/(?:[^\s"'`]+\/)*[^\s"'`,;:)]+)/g,
  )) {
    add(absolute[1]);
  }
  collectPrivatePathFields(raw.message, add, 0);
  collectPrivatePathFields(raw.attachment, add, 0);
  return candidates;
}

function collectPrivatePathFields(
  value: unknown,
  add: (value: string) => void,
  depth: number,
): void {
  if (depth > 5) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) {
      collectPrivatePathFields(item, add, depth + 1);
    }
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value).slice(0, 100)) {
    if (
      typeof child === "string" &&
      /^(?:file_?path|path|notebook_?path|source)$/i.test(key)
    ) {
      add(child);
    } else {
      collectPrivatePathFields(child, add, depth + 1);
    }
  }
}

async function resolveValidatedReferencedFile(
  rawPath: string,
  projectPath: string,
  allowedRoots: string[],
  platform: NodeJS.Platform,
): Promise<string | undefined> {
  if (
    /^(?:https?|data|file):/i.test(rawPath) ||
    rawPath.includes("\u0000") ||
    /[\r\n]/.test(rawPath)
  ) {
    return undefined;
  }
  const pathApi = nativePathApi(platform);
  const trimmed = rawPath.trim().replace(/[),.;:]+$/, "");
  const candidate = pathApi.isAbsolute(trimmed)
    ? pathApi.normalize(trimmed)
    : pathApi.resolve(projectPath, trimmed);
  return validateExistingLocalFile(candidate, allowedRoots, platform);
}

async function validateExistingLocalFile(
  candidate: string,
  allowedRoots: string[],
  platform: NodeJS.Platform,
): Promise<string | undefined> {
  if (!isPathWithinAllowedRoots(candidate, allowedRoots, platform)) {
    return undefined;
  }
  try {
    const [realCandidate, rootResults] = await Promise.all([
      fs.promises.realpath(candidate),
      Promise.all(
        allowedRoots.map((root) =>
          fs.promises.realpath(root).catch(() => undefined),
        ),
      ),
    ]);
    const realRoots = rootResults.filter(
      (root): root is string => root !== undefined,
    );
    if (!isPathWithinAllowedRoots(realCandidate, realRoots, platform)) {
      return undefined;
    }
    const stat = await fs.promises.stat(realCandidate);
    return stat.isFile() ? realCandidate : undefined;
  } catch {
    return undefined;
  }
}

async function isBoundedImage(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile() && stat.size <= MAX_INLINE_IMAGE_BYTES;
  } catch {
    return false;
  }
}

function nativePathApi(platform: NodeJS.Platform): typeof path.posix {
  return platform === "win32" ? path.win32 : path.posix;
}

function isAbsoluteNativePath(
  value: string,
  platform: NodeJS.Platform,
): boolean {
  return nativePathApi(platform).isAbsolute(value);
}

function nativePathIdentity(value: string, platform: NodeJS.Platform): string {
  const resolved = nativePathApi(platform).resolve(value);
  return platform === "win32" ? resolved.toLocaleLowerCase() : resolved;
}

function collectToolPaths(
  content: unknown,
  projectPath: string,
  output: string[],
  identities: Set<string>,
): void {
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (!isObject(block) || block.type !== "tool_use") continue;
    collectPathFields(block.input, projectPath, output, identities, 0);
  }
}

function collectPathFields(
  value: unknown,
  projectPath: string,
  output: string[],
  identities: Set<string>,
  depth: number,
): void {
  if (depth > 4 || output.length >= MAX_MENTIONED_FILES) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPathFields(item, projectPath, output, identities, depth + 1);
    }
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      /^(?:file_?path|path|notebook_?path)$/i.test(key)
    ) {
      addMentionedPath(child, projectPath, output, identities);
    } else {
      collectPathFields(child, projectPath, output, identities, depth + 1);
    }
  }
}

function collectMentionedPaths(
  text: string,
  projectPath: string,
  output: string[],
  identities: Set<string>,
): void {
  const candidates: string[] = [];
  for (const match of text.matchAll(/`([^`\r\n]{1,1000})`/g)) {
    candidates.push(match[1]);
  }
  for (const match of text.matchAll(
    /(?:^|[\s("'])([A-Za-z]:\\[^\s"'`]+|\\\\[^\s"'`]+|\/(?:[^\s"'`]+\/)*[^\s"'`,;:)]+)/g,
  )) {
    candidates.push(match[1]);
  }
  for (const candidate of candidates) {
    addMentionedPath(candidate, projectPath, output, identities);
    if (output.length >= MAX_MENTIONED_FILES) return;
  }
}

function addMentionedPath(
  rawPath: string,
  projectPath: string,
  output: string[],
  identities: Set<string>,
): void {
  if (output.length >= MAX_MENTIONED_FILES) return;
  let candidate = rawPath.trim();
  if (!candidate || candidate.length > MAX_MENTION_LENGTH) return;
  candidate = candidate.replace(/[),.;:]+$/, "");
  if (!looksLikeFilePath(candidate)) return;

  const windowsPath = /^[A-Za-z]:\\|^\\\\/.test(candidate);
  const pathApi =
    windowsPath || /^[A-Za-z]:\\|^\\\\/.test(projectPath)
      ? path.win32
      : path.posix;
  const resolved = pathApi.isAbsolute(candidate)
    ? pathApi.normalize(candidate)
    : pathApi.resolve(projectPath, candidate);
  const identity = mentionedPathIdentity(resolved);
  if (identities.has(identity)) return;
  identities.add(identity);
  output.push(resolved);
}

function mentionedPathIdentity(value: string): string {
  return /^[A-Za-z]:\\|^\\\\/.test(value)
    ? path.win32.normalize(value).toLocaleLowerCase()
    : path.posix.normalize(value);
}

function looksLikeFilePath(value: string): boolean {
  if (/^(?:https?|file):\/\//i.test(value)) return false;
  if (/^[A-Za-z]:\\|^\\\\|^\//.test(value)) return true;
  return /^(?:\.{0,2}[\\/])?[\w@(). -]+(?:[\\/][\w@(). -]+)+\.[A-Za-z0-9_-]{1,16}$/.test(
    value,
  );
}

function cleanIndexedUserMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("<local-command-")) return null;
  if (trimmed.startsWith("<command-")) {
    const name =
      trimmed.match(/<command-name>([\s\S]*?)<\/command-name>/)?.[1]?.trim() ??
      "";
    const args =
      trimmed.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1]?.trim() ??
      "";
    const combined = `${name}${args ? ` ${args}` : ""}`.trim();
    return isShortSlashCommand(combined) ? null : combined || null;
  }
  return isShortSlashCommand(trimmed) ? null : trimmed;
}

function stripAnsiSequences(value: string): string {
  const ansiPattern = new RegExp(
    `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
    "g",
  );
  return value.replace(ansiPattern, "");
}

function inboxFingerprint(inbox: SessionInboxMetadata | undefined): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeSessionInboxMetadata(inbox) ?? null))
    .digest("hex");
}

function normalizeSessionInboxMetadata(
  value: SessionInboxMetadata | undefined,
): SessionInboxMetadata | undefined {
  if (!value || !Array.isArray(value.sources)) return undefined;
  const sources = value.sources
    .map(normalizeSessionSourceDescriptor)
    .filter((source): source is SessionSourceDescriptor => source !== undefined)
    .slice(0, 10);
  return {
    sources,
    title: privateMetadataString(value.title, 500),
    archived: value.archived === true,
    desktopLocalSessionId: privateStableMessageId(value.desktopLocalSessionId),
    desktopBridgeId: privateStableMessageId(value.desktopBridgeId),
    conductorWorkspaceId: privateStableMessageId(value.conductorWorkspaceId),
    workspacePath: privateAbsoluteMetadataPath(value.workspacePath),
  };
}

function normalizeSessionSourceDescriptor(
  value: SessionSourceDescriptor,
): SessionSourceDescriptor | undefined {
  if (
    value.backend !== "claude-cli" &&
    value.backend !== "claude-desktop" &&
    value.backend !== "vscode" &&
    value.backend !== "conductor" &&
    value.backend !== "wsl"
  ) {
    return undefined;
  }
  const nativePath = privateAbsoluteMetadataPath(value.nativePath);
  const externalId =
    value.backend === "wsl"
      ? privateWslDistributionName(value.externalId)
      : privateStableMessageId(value.externalId);
  const workspaceId = privateStableMessageId(value.workspaceId);
  const linuxPath = privateLinuxMetadataPath(value.linuxPath);
  const state =
    value.state === "active" || value.state === "archived"
      ? value.state
      : undefined;
  return {
    backend: value.backend,
    nativePath,
    externalId,
    workspaceId,
    linuxPath,
    state,
  };
}

function privateLinuxMetadataPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4_000) return undefined;
  return path.posix.isAbsolute(value) && !value.includes("\0")
    ? path.posix.normalize(value)
    : undefined;
}

function privateWslDistributionName(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 256) {
    return undefined;
  }
  return !value.includes("\\") &&
    !value.includes("/") &&
    ![...value].some((character) => character.charCodeAt(0) < 32)
    ? value
    : undefined;
}

function privateAbsoluteMetadataPath(value: unknown): string | undefined {
  const candidate = privateMetadataString(value, MAX_MENTION_LENGTH);
  if (!candidate) return undefined;
  if (!path.posix.isAbsolute(candidate) && !path.win32.isAbsolute(candidate)) {
    return undefined;
  }
  return candidate;
}

function addEntrypointSource(
  sources: SessionSourceDescriptor[],
  entrypoint: string | undefined,
  transcriptPath: string,
): SessionSourceDescriptor[] {
  const result = sources.map((source) => ({ ...source }));
  if (!result.some((source) => source.backend === "claude-cli")) {
    result.unshift({ backend: "claude-cli", nativePath: transcriptPath });
  }
  if (
    entrypoint === "claude-vscode" &&
    !result.some((source) => source.backend === "vscode")
  ) {
    result.push({ backend: "vscode", nativePath: transcriptPath });
  }
  if (
    entrypoint === "claude-desktop" &&
    !result.some((source) => source.backend === "claude-desktop")
  ) {
    result.push({ backend: "claude-desktop", nativePath: transcriptPath });
  }
  return result;
}

function privateStableMessageId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,299}$/.test(trimmed)
    ? trimmed
    : undefined;
}

function privateMetadataString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = sanitizeString(value).split("\u0000").join("").trim();
  return cleaned && cleaned.length <= maxLength ? cleaned : undefined;
}

function isShortSlashCommand(value: string): boolean {
  return value.startsWith("/") && value.length < 30;
}

function sanitizeString(value: string): string {
  return value.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "\uFFFD",
  );
}

function safeTextSlice(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  let end = maxLength;
  const code = value.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end--;
  return value.slice(0, end);
}

function boundedContextContent(
  value: string,
  maxLength: number,
  query?: string,
): string {
  if (value.length <= maxLength) return value;
  if (!query) return safeTextSlice(value, maxLength);
  const matchIndex = value
    .toLocaleLowerCase()
    .indexOf(query.toLocaleLowerCase());
  if (matchIndex < 0) return safeTextSlice(value, maxLength);
  const prefix = matchIndex > 0 ? "..." : "";
  const needsSuffix = matchIndex + query.length < value.length;
  const suffix = needsSuffix ? "..." : "";
  const contentBudget = Math.max(1, maxLength - prefix.length - suffix.length);
  const roomAroundMatch = Math.max(0, contentBudget - query.length);
  const start = Math.max(0, matchIndex - Math.floor(roomAroundMatch / 2));
  const end = Math.min(value.length, start + contentBudget);
  const adjustedStart = Math.max(0, end - contentBudget);
  const renderedPrefix = adjustedStart > 0 ? "..." : "";
  const renderedSuffix = end < value.length ? "..." : "";
  const finalBudget = Math.max(
    1,
    maxLength - renderedPrefix.length - renderedSuffix.length,
  );
  return `${renderedPrefix}${value.slice(
    adjustedStart,
    adjustedStart + finalBudget,
  )}${renderedSuffix}`;
}

async function reconcileCorpus(
  corpusPath: string,
  manifest: SearchIndexManifest,
): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(corpusPath);
    if (stat.size < manifest.committedCorpusBytes) return false;
    if (stat.size > manifest.committedCorpusBytes) {
      await fs.promises.truncate(corpusPath, manifest.committedCorpusBytes);
    }
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return manifest.committedCorpusBytes === 0;
    }
    throw error;
  }
}

async function readManifest(
  manifestPath: string,
): Promise<SearchIndexManifest> {
  try {
    const raw: unknown = JSON.parse(
      await fs.promises.readFile(manifestPath, "utf8"),
    );
    if (!isValidManifest(raw)) return emptyManifest();
    return raw;
  } catch (error: unknown) {
    if (
      error instanceof SyntaxError ||
      (error as NodeJS.ErrnoException)?.code === "ENOENT"
    ) {
      return emptyManifest();
    }
    throw error;
  }
}

function isValidManifest(value: unknown): value is SearchIndexManifest {
  if (!isObject(value)) return false;
  if (
    value.version !== INDEX_VERSION ||
    !Number.isSafeInteger(value.committedCorpusBytes) ||
    Number(value.committedCorpusBytes) < 0 ||
    !isObject(value.files)
  ) {
    return false;
  }
  const committedCorpusBytes = Number(value.committedCorpusBytes);
  return Object.values(value.files).every(
    (entry) =>
      isValidIndexedFile(entry) &&
      entry.segments.every(
        (segment) => segment.offset + segment.length <= committedCorpusBytes,
      ),
  );
}

function isValidIndexedFile(value: unknown): value is IndexedSessionFile {
  if (!isObject(value)) return false;
  const stringFields = [
    "sourcePath",
    "sourceProjectDir",
    "projectPath",
    "projectName",
    "sessionId",
    "sourceFingerprint",
    "supplementalFingerprint",
    "summary",
    "firstMessage",
  ];
  if (stringFields.some((field) => typeof value[field] !== "string")) {
    return false;
  }
  if (
    !Number.isFinite(value.mtimeMs) ||
    !Number.isSafeInteger(value.size) ||
    Number(value.size) < 0 ||
    !Number.isSafeInteger(value.indexedBytes) ||
    Number(value.indexedBytes) < 0 ||
    Number(value.indexedBytes) > Number(value.size) ||
    !Number.isSafeInteger(value.turnCount) ||
    Number(value.turnCount) < 0 ||
    !Number.isSafeInteger(value.recordCount) ||
    Number(value.recordCount) < 0 ||
    !Array.isArray(value.segments) ||
    !Array.isArray(value.mentionedFiles) ||
    typeof value.archived !== "boolean" ||
    !Array.isArray(value.sources)
  ) {
    return false;
  }
  return (
    value.segments.every(
      (segment) =>
        isObject(segment) &&
        Number.isSafeInteger(segment.offset) &&
        Number(segment.offset) >= 0 &&
        Number.isSafeInteger(segment.length) &&
        Number(segment.length) > 0 &&
        Number.isSafeInteger(segment.sourceStart) &&
        Number(segment.sourceStart) >= 0 &&
        Number.isSafeInteger(segment.sourceEnd) &&
        Number(segment.sourceEnd) >= Number(segment.sourceStart) &&
        Number.isSafeInteger(segment.recordIndex) &&
        Number(segment.recordIndex) >= 0 &&
        (segment.messageIndex === undefined ||
          (Number.isSafeInteger(segment.messageIndex) &&
            Number(segment.messageIndex) >= 0)) &&
        typeof segment.stableMessageId === "string" &&
        segment.stableMessageId.length > 0 &&
        segment.stableMessageId.length <= 300 &&
        (segment.role === "user" ||
          segment.role === "assistant" ||
          segment.role === "summary"),
    ) &&
    value.mentionedFiles.every(
      (item) => typeof item === "string" && item.length <= MAX_MENTION_LENGTH,
    ) &&
    value.sources.every(isValidSessionSourceDescriptor) &&
    optionalPrivateString(value.title, 500) &&
    optionalPrivateString(value.entrypoint, 100) &&
    optionalPrivateString(value.gitBranch, 500) &&
    optionalPrivateString(value.workspacePath, MAX_MENTION_LENGTH) &&
    optionalPrivateString(value.desktopLocalSessionId, 300) &&
    optionalPrivateString(value.desktopBridgeId, 300) &&
    optionalPrivateString(value.conductorWorkspaceId, 300)
  );
}

function isValidSessionSourceDescriptor(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (
    value.backend !== "claude-cli" &&
    value.backend !== "claude-desktop" &&
    value.backend !== "vscode" &&
    value.backend !== "conductor"
  ) {
    return false;
  }
  return (
    optionalPrivateString(value.nativePath, MAX_MENTION_LENGTH) &&
    optionalPrivateString(value.externalId, 300) &&
    optionalPrivateString(value.workspaceId, 300) &&
    (value.state === undefined ||
      value.state === "active" ||
      value.state === "archived")
  );
}

function optionalPrivateString(value: unknown, maxLength: number): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && value.length > 0 && value.length <= maxLength)
  );
}

function emptyManifest(): SearchIndexManifest {
  return { version: INDEX_VERSION, committedCorpusBytes: 0, files: {} };
}

async function atomicWriteJson(
  filePath: string,
  value: unknown,
): Promise<void> {
  await atomicReplaceFile(
    filePath,
    new TextEncoder().encode(`${JSON.stringify(value)}\n`),
  );
}

async function atomicReplaceFile(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), {
    recursive: true,
    mode: 0o700,
  });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(6).toString(
    "hex",
  )}.tmp`;
  const handle = await fs.promises.open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.promises.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true });
    throw error;
  }
}

async function withIndexLock<T>(
  indexDirectory: string,
  signal: AbortSignal | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const lockPath = path.join(indexDirectory, LOCK_FILE);
  const startedAt = Date.now();
  let lockHandle: fs.promises.FileHandle | undefined;

  while (!lockHandle) {
    assertNotAborted(signal);
    try {
      lockHandle = await fs.promises.open(lockPath, "wx", 0o600);
      await lockHandle.writeFile(
        JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
      );
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      try {
        const stat = await fs.promises.stat(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.promises.rm(lockPath, { force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - startedAt >= LOCK_TIMEOUT_MS) {
        throw new Error("Timed out waiting for the session index lock");
      }
      await wait(LOCK_WAIT_MS, signal);
    }
  }

  const heartbeat = setInterval(
    () => {
      const now = new Date();
      void fs.promises.utimes(lockPath, now, now).catch(() => undefined);
    },
    Math.floor(LOCK_STALE_MS / 3),
  );
  heartbeat.unref();

  try {
    return await action();
  } finally {
    clearInterval(heartbeat);
    await lockHandle.close();
    await fs.promises.rm(lockPath, { force: true });
  }
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new SearchIndexAbortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new SearchIndexAbortError();
}

function concatenateBytes(
  chunks: Uint8Array[],
  totalLength: number,
): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
