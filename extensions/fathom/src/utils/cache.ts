import { statSync } from "node:fs";
import crypto from "crypto";
import { logger } from "@chrismessina/raycast-logger";
import { LocalStorage } from "@raycast/api";
import {
  buildSearchIndex,
  deleteTranscript,
  loadTranscript,
  pruneTranscripts,
  saveTranscript,
  transcriptPath,
} from "./transcriptStore";

/**
 * Cache configuration for different data types
 */
const CACHE_CONFIG = {
  // Meetings with summaries/transcripts are immutable
  MEETINGS: {
    TTL: 30 * 24 * 60 * 60 * 1000, // 30 days
    KEY_PREFIX: "cache:meeting:",
    INDEX_KEY: "cache:meeting:index",
  },
  // Action items can change frequently
  ACTION_ITEMS: {
    TTL: 6 * 60 * 60 * 1000, // 6 hours
    KEY_PREFIX: "cache:action_items:",
  },
  // Metadata for cache management
  METADATA: {
    KEY: "cache:metadata",
  },
} as const;

export interface CachedMeetingData {
  meeting: unknown; // Will be Meeting type
  summary?: string;
  /**
   * Full transcript text.
   *
   * NO LONGER PERSISTED to LocalStorage — it is written to a file by
   * `transcriptStore` and rehydrated on read. Transcripts were 91.5% of every
   * cached value (~99 kB average), which made the cache needlessly heavy and
   * forced the list view to deserialize megabytes to render titles and dates.
   *
   * Still present on the in-memory object so every existing consumer keeps
   * working unchanged.
   */
  transcript?: string;
  /**
   * Compact word set for full-text search. Lives in LocalStorage because search
   * runs synchronously on each keystroke and cannot read files.
   */
  transcriptIndex?: string;
  actionItems?: unknown[]; // Will be ActionItem[]
  cachedAt: number;
  hash: string; // Hash of meeting ID + version
}

interface CacheMetadata {
  totalMeetings: number;
  oldestCachedAt: number;
  newestCachedAt: number;
  lastUpdated: number;
}

interface CachedMeetingIndex {
  meetingIds: string[];
  lastUpdated: number;
}

/**
 * Generate a content hash for cache validation
 */
function generateHash(meetingId: string): string {
  return crypto.createHash("sha256").update(meetingId).digest("hex").substring(0, 16);
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cachedAt: number, ttl: number): boolean {
  return Date.now() - cachedAt < ttl;
}

/**
 * Store a batch of meetings in the cache.
 *
 * Writes are SEQUENTIAL and then verified by reading back — concurrent
 * LocalStorage mutations discard each other. See the comment in the loop.
 */
export async function cacheMeetingsBatch(
  meetings: Array<{
    meetingId: string;
    meeting: unknown;
    summary?: string;
    transcript?: string;
    actionItems?: unknown[];
  }>,
): Promise<void> {
  const now = Date.now();

  // SEQUENTIAL, not parallel. This is the actual fix for the vanishing meetings.
  //
  // Concurrent `LocalStorage.setItem` calls CLOBBER each other. Measured across
  // two runs, with a 21x reduction in payload size between them:
  //
  //     185,280 B payloads, 50 parallel writes -> 5 persisted
  //       8,673 B payloads, 50 parallel writes -> 3 persisted
  //       8,673 B payloads, 10 parallel writes -> 2 persisted
  //
  // Smaller payloads did not help, which rules out a size ceiling. Survivor
  // count tracks CONCURRENCY. Raycast's LocalStorage behaves like a single
  // document that each `setItem` reads, mutates and writes back — so N parallel
  // writers all start from the same snapshot and the last one wins, discarding
  // everyone else's entry. Every call still resolves successfully, which is why
  // nothing ever threw.
  //
  // Awaiting each write serializes the read-modify-write cycle. For 50 small
  // values this costs milliseconds; correctness is not negotiable here.
  const results: Array<
    | { status: "fulfilled"; meetingId: string; bytes: number }
    | { status: "rejected"; meetingId: string; reason: unknown }
  > = [];

  for (const { meetingId, meeting, summary, transcript, actionItems } of meetings) {
    try {
      const cacheKey = `${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${meetingId}`;

      // Transcript to disk; only a small search index goes to LocalStorage.
      //
      // The transcript is carried in TWO places: the top-level `transcript`
      // field AND `meeting.transcriptText`, because `mapMeetingFromHTTP`
      // embeds it. Stripping only the outer one leaves a full copy nested
      // inside `meeting`.
      const fullTranscript = transcript ?? (meeting as { transcriptText?: string })?.transcriptText;
      saveTranscript(meetingId, fullTranscript);
      // The file just changed, so any word set built from the previous one is
      // wrong — it would match text that is gone and miss text that is new.
      forgetTranscript(meetingId);

      // Summaries are duplicated the same way — the outer `summary` field AND
      // `meeting.summaryText`. Keep one copy. (Not the cause of the vanishing
      // meetings, but the same avoidable waste: a long summary was stored twice.)
      const fullSummary = summary ?? (meeting as { summaryText?: string })?.summaryText;

      const leanMeeting = { ...(meeting as Record<string, unknown>) };
      delete leanMeeting.transcriptText;
      delete leanMeeting.summaryText;

      const stored: CachedMeetingData = {
        meeting: leanMeeting,
        summary: fullSummary,
        transcript: undefined,
        transcriptIndex: buildSearchIndex(fullTranscript),
        actionItems,
        cachedAt: now,
        hash: generateHash(meetingId),
      };

      const payload = JSON.stringify(stored);
      await LocalStorage.setItem(cacheKey, payload);
      results.push({ status: "fulfilled", meetingId, bytes: payload.length });
    } catch (error) {
      // Carry the id on the failure branch rather than recovering it by array
      // position. Positional lookup happens to work today (exactly one push per
      // iteration) but breaks silently the moment anyone adds a `continue`, and
      // the failure path is precisely the one that never gets exercised.
      results.push({ status: "rejected", meetingId, reason: error });
    }
  }

  const written: string[] = [];
  const failed: Array<{ meetingId: string; reason: string }> = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      written.push(result.meetingId);
    } else {
      failed.push({
        meetingId: result.meetingId,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  if (failed.length > 0) {
    // Name every casualty. A silent partial write is why a shortfall like this
    // can persist for months without a single error in the log.
    logger.error(`[cache] ${failed.length}/${meetings.length} meeting writes FAILED`, {
      failures: failed.slice(0, 10),
      largestPayloadBytes: Math.max(0, ...results.map((r) => (r.status === "fulfilled" ? r.bytes : 0))),
    });
  } else {
    logger.log(`[cache] Wrote ${written.length} meetings`, {
      largestPayloadBytes: Math.max(0, ...results.map((r) => (r.status === "fulfilled" ? r.bytes : 0))),
    });
  }

  // VERIFY the writes actually persisted.
  //
  // `LocalStorage.setItem` resolves successfully even when the value does not
  // survive — measured: 50 successful writes, 3 survivors, no error anywhere.
  // Every layer reported success, which is why this took months to find. A
  // write that reports OK is not evidence the data is there; only reading it
  // back is. Keep this check even now that writes are serialized.
  const persisted: string[] = [];
  for (const meetingId of written) {
    const probe = await LocalStorage.getItem<string>(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${meetingId}`);
    if (probe) persisted.push(meetingId);
  }

  if (persisted.length !== written.length) {
    logger.error(
      `[cache] SILENT WRITE LOSS: ${written.length} writes reported success, ${persisted.length} persisted`,
      {
        wrote: written.length,
        persisted: persisted.length,
        lost: written.length - persisted.length,
        largestPayloadBytes: Math.max(0, ...results.map((r) => (r.status === "fulfilled" ? r.bytes : 0))),
        hint: "Concurrent LocalStorage.setItem calls clobber each other; writes here are sequential. If this still fires, the storage layer lost data for another reason.",
      },
    );
  }

  // Index only what actually READ BACK, so the index never promises a key that
  // isn't there.
  if (persisted.length > 0) await updateMeetingIndexBatch(persisted);
}

/**
 * Store a meeting with its summary and transcript in the cache
 */
export async function cacheMeeting(
  meetingId: string,
  meeting: unknown,
  summary?: string,
  transcript?: string,
  actionItems?: unknown[],
): Promise<void> {
  await cacheMeetingsBatch([{ meetingId, meeting, summary, transcript, actionItems }]);
}

/**
 * Retrieve cached meeting data
 */
export async function getCachedMeeting(meetingId: string): Promise<CachedMeetingData | null> {
  const cacheKey = `${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${meetingId}`;

  try {
    const cached = await LocalStorage.getItem<string>(cacheKey);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedMeetingData;

    // Check if meeting cache is still valid
    if (!isCacheValid(data.cachedAt, CACHE_CONFIG.MEETINGS.TTL)) {
      await LocalStorage.removeItem(cacheKey);
      // The transcript lives on disk, so dropping the key alone leaks the file.
      deleteTranscript(meetingId);
      forgetTranscript(meetingId);
      return null;
    }

    // Action items have shorter TTL - remove them if expired but keep meeting/summary/transcript
    if (data.actionItems && !isCacheValid(data.cachedAt, CACHE_CONFIG.ACTION_ITEMS.TTL)) {
      data.actionItems = undefined;
    }

    // Rehydrate the transcript from disk. Callers of this function want one
    // specific meeting, so the file read is cheap and expected.
    if (!data.transcript) data.transcript = loadTranscript(meetingId);

    // Restore the nested copies — `Meeting.transcriptText` and
    // `Meeting.summaryText` are stripped before storage (they duplicated the
    // outer fields), but consumers still read them.
    if (data.meeting && typeof data.meeting === "object") {
      const meeting = data.meeting as { transcriptText?: string; summaryText?: string };
      if (data.transcript && !meeting.transcriptText) meeting.transcriptText = data.transcript;
      if (data.summary && !meeting.summaryText) meeting.summaryText = data.summary;
    }

    return data;
  } catch (error) {
    logger.error("Error reading cached meeting:", error);
    return null;
  }
}

/**
 * Update the index for a batch of meeting IDs (single read + single write)
 */
async function updateMeetingIndexBatch(meetingIds: string[]): Promise<void> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    const index: CachedMeetingIndex = indexData ? JSON.parse(indexData) : { meetingIds: [], lastUpdated: Date.now() };

    let changed = false;
    for (const meetingId of meetingIds) {
      if (!index.meetingIds.includes(meetingId)) {
        index.meetingIds.push(meetingId);
        changed = true;
      }
    }

    if (changed) {
      index.lastUpdated = Date.now();
      await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
    }
  } catch (error) {
    logger.error("Error updating meeting index:", error);
  }
}

/**
 * Get all cached meeting IDs
 */
export async function getCachedMeetingIds(): Promise<string[]> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    if (!indexData) return [];

    const index: CachedMeetingIndex = JSON.parse(indexData);
    return index.meetingIds;
  } catch (error) {
    logger.error("Error reading meeting index:", error);
    return [];
  }
}

/**
 * Get all cached meetings — uses allItems() for a single bulk read instead of N individual reads.
 */
export async function getAllCachedMeetings(): Promise<CachedMeetingData[]> {
  try {
    const all = await LocalStorage.allItems();
    const prefix = CACHE_CONFIG.MEETINGS.KEY_PREFIX;
    const ttl = CACHE_CONFIG.MEETINGS.TTL;
    const actionItemsTtl = CACHE_CONFIG.ACTION_ITEMS.TTL;

    const meetings: CachedMeetingData[] = [];
    const expiredIds: string[] = [];
    const malformed: string[] = [];
    let candidateKeys = 0;

    for (const [key, value] of Object.entries(all)) {
      if (!key.startsWith(prefix)) continue;
      // Skip the index key itself
      if (key === CACHE_CONFIG.MEETINGS.INDEX_KEY) continue;
      candidateKeys++;

      try {
        const data = JSON.parse(value as string) as CachedMeetingData;

        if (!isCacheValid(data.cachedAt, ttl)) {
          expiredIds.push(key.slice(prefix.length));
          continue;
        }

        if (data.actionItems && !isCacheValid(data.cachedAt, actionItemsTtl)) {
          data.actionItems = undefined;
        }

        // NOTE: transcripts are deliberately NOT rehydrated here.
        //
        // This is the list-view path — it runs on every launch and renders
        // title/date/duration only. Reading N transcript files to display three
        // fields is exactly the cost this refactor removes. `transcriptIndex`
        // is already present for search; the full text is fetched lazily by
        // `getCachedMeeting` when a detail view opens.
        meetings.push(data);
      } catch (error) {
        // Previously skipped in silence, which is how a cache that quietly
        // loses records stays undiagnosed. Name the key.
        malformed.push(key.slice(prefix.length));
        logger.warn(`[cache] Malformed entry dropped: ${key}`, error);
      }
    }

    // Full accounting. If `returned` is far below `storedKeys`, the loss is
    // here — and that is precisely the symptom that went undiagnosed for months.
    if (expiredIds.length > 0 || malformed.length > 0 || candidateKeys !== meetings.length) {
      logger.log("[cache] getAllCachedMeetings accounting", {
        storedKeys: candidateKeys,
        returned: meetings.length,
        expired: expiredIds.length,
        malformed: malformed.length,
      });
    }

    // Prune expired entries from the index asynchronously (don't block return)
    if (expiredIds.length > 0) {
      pruneExpiredFromIndex(expiredIds).catch(() => {});
    }

    return meetings;
  } catch (error) {
    logger.error("Error reading all cached meetings:", error);
    return [];
  }
}

/**
 * Remove expired IDs from the index (background cleanup)
 */
async function pruneExpiredFromIndex(expiredIds: string[]): Promise<void> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    if (!indexData) return;
    const index: CachedMeetingIndex = JSON.parse(indexData);
    const expiredSet = new Set(expiredIds);
    index.meetingIds = index.meetingIds.filter((id) => !expiredSet.has(id));
    index.lastUpdated = Date.now();
    await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
    // Sequential: concurrent LocalStorage mutations clobber each other — the
    // same race that was silently discarding 47 of 50 meeting writes.
    for (const id of expiredIds) {
      await LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`);
      // This is the path the list load actually takes; without it the
      // single-entry fix above covers only the rarer direct read.
      deleteTranscript(id);
      forgetTranscript(id);
    }
  } catch (error) {
    logger.error("Error pruning expired meetings from index:", error);
  }
}

/**
 * Clear old cache entries to maintain size limits
 * Keeps only the most recent N meetings
 */
export async function pruneCache(keepCount: number = 50): Promise<void> {
  try {
    const meetings = await getAllCachedMeetings();
    if (meetings.length <= keepCount) return;

    // Sort by cachedAt descending, keep newest N
    meetings.sort((a, b) => b.cachedAt - a.cachedAt);
    const toRemove = meetings.slice(keepCount);
    const toKeep = meetings.slice(0, keepCount);

    const getMeetingId = (m: CachedMeetingData): string => {
      const meeting = m.meeting as { recordingId?: string; id?: string };
      return meeting.recordingId || meeting.id || "";
    };

    // Sequential, for the same reason as every other mutation here: parallel
    // LocalStorage writes discard each other's changes.
    for (const m of toRemove) {
      const id = getMeetingId(m);
      if (id) await LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`);
    }

    // Rewrite index with only kept IDs
    const keptIds = toKeep.map(getMeetingId).filter(Boolean);
    // Files are not LocalStorage keys; without this the pruned meetings'
    // transcripts stay under supportPath forever.
    pruneTranscripts(new Set(keptIds));
    // The in-memory copies outlive the files otherwise, so a pruned meeting
    // would keep matching searches until the command is relaunched.
    clearFullTranscriptCache();
    const index: CachedMeetingIndex = { meetingIds: keptIds, lastUpdated: Date.now() };
    await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    logger.error("Error pruning cache:", error);
  }
}

/**
 * Update cache metadata from in-memory meetings (avoids re-reading from storage)
 */
export async function updateCacheMetadataFromMeetings(meetings: CachedMeetingData[]): Promise<void> {
  try {
    if (meetings.length === 0) {
      await LocalStorage.removeItem(CACHE_CONFIG.METADATA.KEY);
      return;
    }

    const cachedTimes = meetings.map((m) => m.cachedAt);
    const metadata: CacheMetadata = {
      totalMeetings: meetings.length,
      oldestCachedAt: Math.min(...cachedTimes),
      newestCachedAt: Math.max(...cachedTimes),
      lastUpdated: Date.now(),
    };

    await LocalStorage.setItem(CACHE_CONFIG.METADATA.KEY, JSON.stringify(metadata));
  } catch (error) {
    logger.error("Error updating cache metadata:", error);
  }
}

/**
 * Update cache metadata
 */
export async function updateCacheMetadata(): Promise<void> {
  const meetings = await getAllCachedMeetings();
  await updateCacheMetadataFromMeetings(meetings);
}

/**
 * Get cache metadata
 */
export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  try {
    const data = await LocalStorage.getItem<string>(CACHE_CONFIG.METADATA.KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error("Error reading cache metadata:", error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const meetingIds = await getCachedMeetingIds();

    for (const id of meetingIds) {
      await LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`);
    }

    await LocalStorage.removeItem(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    await LocalStorage.removeItem(CACHE_CONFIG.METADATA.KEY);
    // Clearing the cache must clear the on-disk half too.
    pruneTranscripts(new Set());
    clearFullTranscriptCache();
  } catch (error) {
    logger.error("Error clearing cache:", error);
  }
}

/**
 * Perform full-text search over cached meetings
 * Searches titles, summaries, and transcripts
 */
/**
 * On-disk transcripts held in memory for the life of this command instance.
 *
 * Stores the RAW lowercased text, not a word set. A word set is far smaller,
 * but `buildSearchIndex` drops one-character tokens and bare numbers and splits
 * on punctuation — so `a`, `42` and `follow-up` stop matching. Those worked
 * before transcripts moved to disk, and a fallback whose whole purpose is "what
 * the index could not answer" must not introduce a second class of things it
 * cannot answer either. Substring semantics here are the same semantics the
 * transcript had when it lived in LocalStorage.
 *
 * Bounded by an estimate of RETAINED BYTES rather than entry count, because
 * transcripts vary by an order of magnitude and a count says nothing about
 * memory. The estimate is deliberately conservative: two bytes per UTF-16 code
 * unit plus a per-entry allowance, so a non-ASCII transcript is not counted as
 * though it were ASCII. An earlier version
 * capped at 200 entries against a 500-meeting corpus, which was worse than no
 * cache: a scan evicted exactly what the next scan needed and re-read every
 * file each time. Eviction is insertion-order; a miss costs a re-read, never
 * correctness.
 *
 * Typical use sits far below the budget — `pruneCache` keeps 50 meetings by
 * default, roughly 3 MB of transcript.
 */
interface CachedTranscript {
  /** Lowercased file contents. */
  text: string;
  /** Identity of the bytes this was read from, so a changed file is noticed. */
  mtimeMs: number;
  size: number;
  /** Monotonic timestamp of when that identity was last confirmed. */
  checkedAt: number;
}

const transcriptTextCache = new Map<string, CachedTranscript>();
const TRANSCRIPT_CACHE_BUDGET_BYTES = 32 * 1024 * 1024;
const TRANSCRIPT_FRESHNESS_MS = 2_000;
let transcriptCacheBytes = 0;

/**
 * Lowercased transcript text, reused while the file behind it is unchanged.
 *
 * Validated with a `stat` rather than trusted. The other command in this
 * extension writes these files into the same directory, so this process can
 * hold text that is stale — or hold the ABSENCE of a transcript that has since
 * appeared, which hides that meeting from every later search until the command
 * closes. Nothing in-process would ever learn either.
 *
 * That `stat` is rate-limited per entry, because this runs on the RENDER path:
 * every keystroke re-filters the whole corpus, so validating each hit would put
 * hundreds of synchronous file checks between the key and the frame. A recent
 * hit is reused untouched, so the steady-state cost of typing is a Map lookup.
 * The window bounds how long a transcript written by the other command stays
 * invisible — seconds, not the life of the command, which is the bug this
 * validation exists to prevent.
 *
 * A missing transcript is never cached: it can appear at any moment, and its
 * `stat` throws without ever reading, so there is nothing to rate-limit.
 *
 * The window is measured on `performance.now()`, not the wall clock. An NTP
 * correction or a daylight-saving jump moves `Date.now()` backwards, which
 * makes an entry's age negative and pins it inside the window — a stale
 * transcript held until the clock catches up. This is the same reason the
 * download helper does not time out on wall-clock time.
 */
function transcriptTextFor(recordingId: string): string {
  const hit = transcriptTextCache.get(recordingId);
  const now = performance.now();
  if (hit !== undefined && now - hit.checkedAt < TRANSCRIPT_FRESHNESS_MS) return hit.text;

  let stat: { mtimeMs: number; size: number } | undefined;
  try {
    stat = statSync(transcriptPath(recordingId));
  } catch {
    // No file yet — and the absence is never recorded, because the other
    // command can write one at any moment.
  }

  if (stat !== undefined && hit !== undefined && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) {
    hit.checkedAt = now;
    return hit.text;
  }

  // Past this point anything held is wrong: the file is gone, or these are
  // different bytes. Release it once, before any path that replaces it.
  forgetTranscript(recordingId);
  if (stat === undefined) return "";

  const text = (loadTranscript(recordingId) ?? "").toLowerCase();
  if (!text) return "";

  const cost = estimatedBytes(text);

  // One transcript larger than the whole budget is searched but NOT retained.
  // Evicting everything and storing it anyway would hold more than the limit
  // this cache exists to enforce, for the life of the command.
  if (cost > TRANSCRIPT_CACHE_BUDGET_BYTES) return text;

  // Insertion order, so this walks oldest first. `forgetTranscript` owns the
  // byte accounting; a second copy of it here is how the counter drifts.
  for (const id of transcriptTextCache.keys()) {
    if (transcriptCacheBytes + cost <= TRANSCRIPT_CACHE_BUDGET_BYTES) break;
    forgetTranscript(id);
  }

  transcriptTextCache.set(recordingId, { text, mtimeMs: stat.mtimeMs, size: stat.size, checkedAt: now });
  transcriptCacheBytes += cost;
  return text;
}

/**
 * Conservative retained size for a cached string.
 *
 * `String.length` counts UTF-16 code units, not bytes, so a transcript in a
 * non-Latin script would be undercounted by half against a budget expressed in
 * bytes. The per-entry allowance covers the Map entry and the key.
 */
function estimatedBytes(text: string): number {
  return text.length * 2 + 128;
}

/** Forget one meeting's cached transcript — it changed or went away. */
function forgetTranscript(recordingId: string): void {
  const held = transcriptTextCache.get(recordingId);
  if (held === undefined) return;
  transcriptCacheBytes -= estimatedBytes(held.text);
  transcriptTextCache.delete(recordingId);
}

/** Drop every cached transcript — the corpus changed underneath. */
function clearFullTranscriptCache(): void {
  transcriptTextCache.clear();
  transcriptCacheBytes = 0;
}

export function searchCachedMeetings(cachedMeetings: CachedMeetingData[], query: string): CachedMeetingData[] {
  if (!query.trim()) {
    return cachedMeetings;
  }

  const searchTerms = query.toLowerCase().split(/\s+/);
  logger.log(`[searchCachedMeetings] Searching ${cachedMeetings.length} meetings for: "${query}"`);

  const results = cachedMeetings.filter((cached) => {
    const meeting = cached.meeting as { title?: string; meetingTitle?: string; recordingId?: string; id?: string };
    // `transcriptIndex` is a deduplicated word set capped at 2 kB, because
    // LocalStorage silently discards writes past ~500 kB TOTAL (see
    // `transcriptStore`) — an unbounded index recreates the data-loss bug that
    // module exists to prevent. `cached.transcript` covers entries written
    // before transcripts moved to disk.
    const indexed = [
      meeting.title || "",
      meeting.meetingTitle || "",
      cached.summary || "",
      cached.transcriptIndex || cached.transcript || "",
    ]
      .join(" ")
      .toLowerCase();

    const unmatched = searchTerms.filter((term) => !indexed.includes(term));
    if (unmatched.length === 0) return true;

    // The index missed at least one term, and a miss is not an answer: the cap
    // means a word later in the transcript is simply absent from it. Measured
    // by a reviewer on a 2,979-word transcript, only 194 words were indexed.
    // So consult the full text on disk for the terms the index could not
    // settle. Per-meeting on purpose — an earlier attempt only ran when the
    // whole query returned zero results, which meant one match anywhere
    // suppressed the fallback for every other meeting and left the truncation
    // case unfixed.
    const recordingId = meeting.recordingId || meeting.id;
    if (!recordingId) return false;

    const transcript = transcriptTextFor(recordingId);
    if (!transcript) return false;

    return unmatched.every((term) => transcript.includes(term));
  });

  logger.log(`[searchCachedMeetings] Found ${results.length} matches`);
  return results;
}
