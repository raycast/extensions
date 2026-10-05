import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import {
  array,
  canonical,
  emptyCatalog,
  entityKey,
  hasLocation,
  id,
  invalid,
  keys,
  LibraryError,
  MAX_EVENT_BYTES,
  MAX_EVENTS,
  MAX_TOTAL_BYTES,
  object,
  timestamp,
  TRASH_LOCATION,
  validateBookmark,
  validateCatalog,
} from "./model.ts";
import type {
  Bookmark,
  Candidate,
  Catalog,
  Heads,
  LibraryEvent,
  LibraryState,
  Mutation,
  Visit,
} from "./model.ts";
import { withSharedJsonWrite } from "./shared-json-storage.ts";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TEMP =
  /^\.pending-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/;
function uuid(value: unknown): string {
  const result = id(value);
  if (!UUID.test(result)) invalid("Invalid event ID");
  return result;
}
function code(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException)?.code;
}
function safeError(error: unknown): LibraryError {
  return error instanceof LibraryError
    ? error
    : new LibraryError(
        "UNAVAILABLE",
        "Directory or file unavailable; not saved. Check local download and permissions",
      );
}

/** Returns a canonical dedicated root. Only the fixed local default may be created implicitly. */
export async function configureDirectory(
  preference: string | undefined,
  supportPath: string,
): Promise<string> {
  const custom = preference?.trim();
  const selected = custom || path.join(supportPath, "marks-library");
  const expanded =
    selected === "~"
      ? homedir()
      : selected.startsWith("~/")
        ? path.join(homedir(), selected.slice(2))
        : selected;
  if (!path.isAbsolute(expanded))
    invalid("Data directory must be an absolute path");
  try {
    if (!custom) await fs.mkdir(expanded, { recursive: true, mode: 0o700 });
    const root = await fs.realpath(expanded);
    if (!(await fs.stat(root)).isDirectory())
      invalid("Data directory does not exist");
    const entries = await fs.readdir(root);
    const allowed = new Set(["events", "icons", ".DS_Store"]);
    if (entries.some((n) => !allowed.has(n)))
      invalid(
        "Choose an empty dedicated directory or one containing only events/icons",
      );
    if (!entries.includes("events"))
      await fs.mkdir(path.join(root, "events"), { mode: 0o700 }).catch((e) => {
        if (code(e) !== "EEXIST") throw e;
      });
    if (!entries.includes("icons"))
      await fs.mkdir(path.join(root, "icons"), { mode: 0o700 }).catch((e) => {
        if (code(e) !== "EEXIST") throw e;
      });
    await checkedDirectory(root);
    return root;
  } catch (e) {
    throw safeError(e);
  }
}

async function checkedDirectory(directory: string): Promise<string> {
  if (
    !path.isAbsolute(directory) ||
    (await fs.realpath(directory)) !== directory ||
    !(await fs.lstat(directory)).isDirectory()
  )
    throw new LibraryError(
      "UNAVAILABLE",
      "Reconfirm the dedicated directory path",
    );
  const allowed = new Set(["events", "icons", ".DS_Store"]);
  if ((await fs.readdir(directory)).some((n) => !allowed.has(n)))
    throw new LibraryError(
      "CORRUPT",
      "Unknown file found in dedicated directory",
    );
  const events = path.join(directory, "events");
  const stat = await fs.lstat(events);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (await fs.realpath(events)) !== events
  )
    throw new LibraryError(
      "CORRUPT",
      "events must be a real subdirectory of the dedicated directory",
    );
  const icons = path.join(directory, "icons");
  try {
    const iconStat = await fs.lstat(icons);
    if (
      !iconStat.isDirectory() ||
      iconStat.isSymbolicLink() ||
      (await fs.realpath(icons)) !== icons
    )
      throw new LibraryError(
        "CORRUPT",
        "icons must be a real subdirectory of the dedicated directory",
      );
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      await fs.mkdir(icons, { mode: 0o700 });
    } else if (e instanceof LibraryError) {
      throw e;
    } else {
      throw e;
    }
  }
  return events;
}

async function readBounded(file: string, max: number): Promise<string> {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink())
    throw new LibraryError(
      "CORRUPT",
      "Regular files only; symlinks are rejected",
    );
  if (before.size > max)
    throw new LibraryError("LIMIT", "File exceeds size limit");
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.ino !== before.ino || stat.dev !== before.dev)
      throw new LibraryError("CORRUPT", "File changed before it could be read");
    const buffer = Buffer.alloc(max + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        size,
        buffer.length - size,
        null,
      );
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > max) throw new LibraryError("LIMIT", "File exceeds size limit");
    return new TextDecoder("utf-8", { fatal: true }).decode(
      buffer.subarray(0, size),
    );
  } finally {
    await handle.close();
  }
}

export function validateEvent(value: unknown): LibraryEvent {
  const raw = object(value);
  if (raw.schemaVersion !== 1)
    throw new LibraryError("UNKNOWN_SCHEMA", "Unsupported event version");
  keys(raw, ["schemaVersion", "eventId", "occurredAt", "mutations", "visits"]);
  const eventId = uuid(raw.eventId);
  const entities = new Set<string>();
  const mutations: Mutation[] = array(raw.mutations).map((v) => {
    const m = object(v);
    keys(m, ["entity", "entityId", "baseHeads", "value"]);
    if (m.entity !== "bookmark" && m.entity !== "catalog") invalid();
    const entityId = id(m.entityId);
    const key = entityKey(m.entity, entityId);
    if (entities.has(key))
      invalid("Cannot change the same entity twice in one transaction");
    entities.add(key);
    const baseHeads = array(m.baseHeads).map(uuid);
    if (
      new Set(baseHeads).size !== baseHeads.length ||
      baseHeads.includes(eventId)
    )
      invalid("Duplicate parent version or self-reference");
    const result =
      m.entity === "catalog"
        ? validateCatalog(m.value)
        : validateBookmark(m.value);
    if (result.id !== entityId) invalid("Entity ID mismatch");
    return { entity: m.entity, entityId, baseHeads, value: result };
  });
  const visits: Visit[] = array(raw.visits).map((v) => {
    const o = object(v);
    keys(o, ["bookmarkId", "usedAt"]);
    return { bookmarkId: id(o.bookmarkId), usedAt: timestamp(o.usedAt) };
  });
  if (!mutations.length && !visits.length)
    invalid("Empty transaction rejected");
  return {
    schemaVersion: 1,
    eventId,
    occurredAt: timestamp(raw.occurredAt),
    mutations,
    visits,
  };
}

/** Pure deterministic replay, including duplicate delivery. No time-based winner selection. */
export function replayEvents(input: LibraryEvent[]): LibraryState {
  const events = new Map<string, LibraryEvent>();
  for (const raw of input) {
    const event = validateEvent(raw);
    const prior = events.get(event.eventId);
    if (prior && canonical(prior) !== canonical(event))
      throw new LibraryError("CORRUPT", "Same event ID has different content");
    events.set(event.eventId, event);
  }
  const versions = new Map<string, Map<string, Mutation>>();
  for (const e of events.values())
    for (const m of e.mutations) {
      const key = entityKey(m.entity, m.entityId);
      if (!versions.has(key)) versions.set(key, new Map());
      versions.get(key)!.set(e.eventId, m);
    }
  const pendingEvents = new Map(events);
  const completedEvents = new Set<string>();
  while (pendingEvents.size) {
    let advanced = false;
    for (const [eventId, event] of pendingEvents)
      if (
        event.mutations.every((m) =>
          m.baseHeads.every((parent) => completedEvents.has(parent)),
        )
      ) {
        completedEvents.add(eventId);
        pendingEvents.delete(eventId);
        advanced = true;
      }
    if (!advanced)
      throw new LibraryError(
        "CORRUPT",
        "Event transaction has missing or circular dependencies",
      );
  }
  const heads: Heads = Object.create(null);
  const candidates = new Map<string, Candidate[]>();
  for (const [key, versionsForEntity] of versions) {
    const consumed = new Set<string>();
    const remaining = new Map(versionsForEntity);
    const done = new Set<string>();
    for (const m of remaining.values())
      for (const parent of m.baseHeads) {
        if (!versionsForEntity.has(parent))
          throw new LibraryError(
            "CORRUPT",
            "Parent event has not arrived locally or references the wrong entity",
          );
        consumed.add(parent);
      }
    while (remaining.size) {
      let advanced = false;
      for (const [eventId, mutation] of remaining)
        if (mutation.baseHeads.every((p) => done.has(p))) {
          done.add(eventId);
          remaining.delete(eventId);
          advanced = true;
        }
      if (!advanced)
        throw new LibraryError("CORRUPT", "Circular event dependency");
    }
    heads[key] = [...versionsForEntity.keys()]
      .filter((eventId) => !consumed.has(eventId))
      .sort();
    candidates.set(
      key,
      heads[key].map((eventId) => ({
        eventId,
        value: versionsForEntity.get(eventId)!.value,
      })),
    );
  }
  const state: LibraryState = {
    status: "ready",
    catalog: emptyCatalog(),
    bookmarks: [],
    heads,
    conflicts: [],
    issues: [],
    baseBookmarks: Object.create(null),
    visitCounts: Object.create(null),
  };
  for (const [key, options] of candidates) {
    if (options.length > 1) {
      state.conflicts.push({
        entityKey: key,
        reason: "multiple-heads",
        candidates: options,
        message:
          "Multiple concurrent versions; select one explicitly before writing",
      });
      continue;
    }
    if (key === "catalog:catalog") state.catalog = options[0].value as Catalog;
    else {
      const bookmark = options[0].value as Bookmark;
      state.baseBookmarks[bookmark.id] = bookmark;
      state.bookmarks.push(structuredClone(bookmark));
    }
  }
  const latest: Record<string, number> = Object.create(null);
  for (const e of events.values())
    for (const v of e.visits) {
      if (!versions.has(entityKey("bookmark", v.bookmarkId)))
        throw new LibraryError(
          "CORRUPT",
          "Visit event references a nonexistent bookmark",
        );
      state.visitCounts[v.bookmarkId] =
        (state.visitCounts[v.bookmarkId] ?? 0) + 1;
      latest[v.bookmarkId] = Math.max(latest[v.bookmarkId] ?? 0, v.usedAt);
    }
  for (const bookmark of state.bookmarks) {
    bookmark.visits =
      (bookmark.visits ?? 0) + (state.visitCounts[bookmark.id] ?? 0);
    if (latest[bookmark.id] !== undefined)
      bookmark.lastUsed = Math.max(bookmark.lastUsed ?? 0, latest[bookmark.id]);
    const key = entityKey("bookmark", bookmark.id);
    const inTrash = bookmark.locations.some(
      (l) => l.groupId === TRASH_LOCATION.groupId,
    );
    if (
      !bookmark.locations.length ||
      bookmark.locations.some((l) => !hasLocation(state.catalog, l)) ||
      (bookmark.isDeleted === true
        ? !inTrash || bookmark.locations.length !== 1
        : inTrash)
    ) {
      state.conflicts.push({
        entityKey: key,
        reason: "invalid-locations",
        candidates: candidates.get(key)!,
        message:
          "Category reference is missing or deletion state conflicts with Trash location; repair locations",
      });
    }
  }
  state.bookmarks.sort((a, b) => a.id.localeCompare(b.id));
  if (state.conflicts.length) state.status = "conflicted";
  return state;
}

async function scan(
  directory: string,
): Promise<{ events: LibraryEvent[]; bytes: number }> {
  const folder = await checkedDirectory(directory);
  const names = (await fs.readdir(folder)).filter(
    (name) => name !== ".DS_Store",
  );
  if (names.length > MAX_EVENTS * 2)
    throw new LibraryError("LIMIT", "Directory file count exceeds limit");
  if (names.filter((name) => !TEMP.test(name)).length > MAX_EVENTS)
    throw new LibraryError("LIMIT", "Event count exceeds the 10,000 limit");
  let bytes = 0;
  const events: LibraryEvent[] = [];
  for (const name of names.sort()) {
    const file = path.join(folder, name);
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new LibraryError(
        "CORRUPT",
        "Events directory contains a non-regular file",
      );
    if (TEMP.test(name)) continue;
    if (!name.endsWith(".json") || !UUID.test(name.slice(0, -5)))
      throw new LibraryError(
        "CORRUPT",
        "Events directory contains an unknown committed file",
      );
    bytes += stat.size;
    if (bytes > MAX_TOTAL_BYTES || events.length >= MAX_EVENTS)
      throw new LibraryError("LIMIT", "Event library exceeds capacity limit");
    let event: LibraryEvent;
    try {
      const content = await readBounded(
        file,
        Math.min(MAX_EVENT_BYTES, MAX_TOTAL_BYTES - (bytes - stat.size)),
      );
      bytes += Buffer.byteLength(content) - stat.size;
      event = validateEvent(JSON.parse(content));
    } catch (e) {
      if (
        e instanceof LibraryError &&
        ["LIMIT", "UNKNOWN_SCHEMA"].includes(e.code)
      )
        throw e;
      throw new LibraryError("CORRUPT", `Invalid event: ${name}`);
    }
    if (`${event.eventId}.json` !== name)
      throw new LibraryError(
        "CORRUPT",
        "Event filename does not match content",
      );
    events.push(event);
  }
  await checkedDirectory(directory);
  return { events, bytes };
}

export async function readLibrary(directory: string): Promise<LibraryState> {
  try {
    return replayEvents((await scan(directory)).events);
  } catch (error) {
    const e = safeError(error);
    // No unverified partial data is presented as a writable empty library.
    return {
      status: "blocked",
      bookmarks: [],
      catalog: emptyCatalog(),
      heads: Object.create(null),
      conflicts: [],
      issues: [{ code: e.code, message: e.message }],
      baseBookmarks: Object.create(null),
      visitCounts: Object.create(null),
    };
  }
}

/** Atomic no-overwrite publication; exported for filesystem contract checks, not UI writes. */
export async function publishEvent(
  directory: string,
  event: LibraryEvent,
  cleanup: (file: string) => Promise<void> = fs.unlink,
): Promise<{ cleanupWarning?: string }> {
  const folder = await checkedDirectory(directory);
  const data = canonical(validateEvent(event));
  if (Buffer.byteLength(data) > MAX_EVENT_BYTES)
    throw new LibraryError("LIMIT", "Transaction exceeds 10 MiB; not saved");
  const temp = path.join(folder, `.pending-${randomUUID()}.tmp`);
  const final = path.join(folder, `${event.eventId}.json`);
  const before = await fs.lstat(folder);
  let published = false;
  try {
    const handle = await fs.open(temp, "wx", 0o600);
    try {
      await handle.writeFile(data, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await checkedDirectory(directory);
    const after = await fs.lstat(folder);
    const tempStat = await fs.lstat(temp);
    if (
      before.ino !== after.ino ||
      before.dev !== after.dev ||
      tempStat.isSymbolicLink() ||
      !tempStat.isFile()
    )
      throw new LibraryError("WRITE_FAILED", "Directory changed during write");
    await fs.link(temp, final);
    published = true;
    try {
      await cleanup(temp);
    } catch {
      if ((await readBounded(final, MAX_EVENT_BYTES)) !== data)
        throw new LibraryError(
          "WRITE_FAILED",
          "Post-publish verification failed; do not retry automatically. Reload instead",
        );
      return {
        cleanupWarning:
          "Saved locally, but temporary-file cleanup failed; commit was not retried",
      };
    }
    return {};
  } catch (e) {
    if (!published) await fs.unlink(temp).catch(() => undefined);
    if (e instanceof LibraryError) throw e;
    throw new LibraryError(
      "WRITE_FAILED",
      published
        ? "May have been saved; reload and do not retry automatically"
        : "Event not published: filesystem cannot publish safely, permission denied, or file already exists",
    );
  }
}
export interface CommitRequest {
  mutations: Mutation[];
  visits?: Visit[];
  expectedHeads: Heads;
}
export interface CommitResult {
  eventId: string;
  state: LibraryState;
  localWritten: true;
  warning?: string;
}
function sameHeads(a: Heads, b: Heads): boolean {
  const normalize = (h: Heads) =>
    Object.fromEntries(
      Object.entries(h)
        .filter(([, v]) => v.length)
        .map(([k, v]) => [k, [...v].sort()]),
    );
  return canonical(normalize(a)) === canonical(normalize(b));
}
async function writeTransaction(
  directory: string,
  request: CommitRequest,
  resolving: boolean,
): Promise<CommitResult> {
  const { events, bytes } = await scan(directory).catch((e) => {
    throw safeError(e);
  });
  const state = replayEvents(events);
  if (!sameHeads(state.heads, request.expectedHeads))
    throw new LibraryError(
      "STALE_HEADS",
      "Data changed; reopen the form or preview",
    );
  if (state.status !== "ready" && !resolving)
    throw new LibraryError(
      "CONFLICT",
      "Unresolved conflicts; normal writes are paused for the entire library",
    );
  if (resolving && request.visits?.length)
    invalid("Cannot add visits while resolving conflicts");
  const event = validateEvent({
    schemaVersion: 1,
    eventId: randomUUID(),
    occurredAt: Date.now(),
    mutations: request.mutations,
    visits: request.visits ?? [],
  });
  for (const m of event.mutations) {
    if (
      !sameHeads(
        { key: m.baseHeads },
        { key: state.heads[entityKey(m.entity, m.entityId)] ?? [] },
      )
    )
      throw new LibraryError("STALE_HEADS", "Entity parent version changed");
    if (m.entity === "bookmark") {
      const bookmark = m.value as Bookmark;
      const bases = events.flatMap((e) =>
        e.mutations
          .filter(
            (old) =>
              m.baseHeads.includes(e.eventId) &&
              old.entity === "bookmark" &&
              old.entityId === m.entityId,
          )
          .map((old) => old.value as Bookmark),
      );
      if (
        bases.length &&
        !bases.some(
          (base) =>
            base.visits === bookmark.visits &&
            base.lastUsed === bookmark.lastUsed,
        )
      )
        invalid(
          "Editing cannot change the base visit count; choose an existing version's count",
        );
    }
  }
  const next = replayEvents([...events, event]);
  if (next.status !== "ready")
    throw new LibraryError(
      "CONFLICT",
      "Transaction did not resolve all conflicts or created an invalid category reference; not saved",
    );
  const size = Buffer.byteLength(canonical(event));
  if (
    events.length >= MAX_EVENTS ||
    bytes + size > MAX_TOTAL_BYTES ||
    size > MAX_EVENT_BYTES
  )
    throw new LibraryError(
      "LIMIT",
      "Transaction or event library exceeds capacity; not saved",
    );
  const publication = await publishEvent(directory, event);
  const result = await readLibrary(directory);
  return {
    eventId: event.eventId,
    state: result,
    localWritten: true,
    warning: publication.cleanupWarning,
  };
}
export async function commit(
  directory: string,
  request: CommitRequest,
): Promise<CommitResult> {
  return withSharedJsonWrite(directory, () =>
    writeTransaction(directory, request, false),
  );
}
/** Resolutions are complete chosen snapshots (including tombstones), based on ALL current heads. */
export async function resolveConflicts(
  directory: string,
  resolutions: Mutation[],
  expectedHeads: Heads,
): Promise<CommitResult> {
  return withSharedJsonWrite(directory, () =>
    writeTransaction(
      directory,
      { mutations: resolutions, expectedHeads },
      true,
    ),
  );
}
