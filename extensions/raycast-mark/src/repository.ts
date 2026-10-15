import { t } from "./i18n.ts";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import {
  canonical,
  emptyCatalog,
  entityKey,
  invalid,
  LibraryError,
  MAX_EVENT_BYTES,
  MAX_EVENTS,
  MAX_TOTAL_BYTES,
} from "./model.ts";
import type {
  Bookmark,
  Heads,
  LibraryEvent,
  LibraryState,
  Mutation,
  Visit,
} from "./model.ts";
import {
  EVENT_UUID as UUID,
  replayEvents,
  validateEvent,
} from "./event-replay.ts";
export { replayEvents, validateEvent } from "./event-replay.ts";
import { withSharedJsonWrite } from "./shared-json-storage.ts";

const TEMP =
  /^\.pending-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/;
function code(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException)?.code;
}
function safeError(error: unknown): LibraryError {
  return error instanceof LibraryError
    ? error
    : new LibraryError(
        "UNAVAILABLE",
        t("目录或文件不可用；未写入，请检查本地下载和权限"),
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
  if (!path.isAbsolute(expanded)) invalid(t("数据目录必须为绝对路径"));
  try {
    if (!custom) await fs.mkdir(expanded, { recursive: true, mode: 0o700 });
    const root = await fs.realpath(expanded);
    if (!(await fs.stat(root)).isDirectory()) invalid(t("数据目录不存在"));
    const entries = await fs.readdir(root);
    const allowed = new Set(["events", "icons", ".DS_Store"]);
    if (entries.some((n) => !allowed.has(n)))
      invalid(t("请选择空目录或仅包含 events/icons 的专用目录"));
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
    throw new LibraryError("UNAVAILABLE", t("请重新确认专用目录路径"));
  const allowed = new Set(["events", "icons", ".DS_Store"]);
  if ((await fs.readdir(directory)).some((n) => !allowed.has(n)))
    throw new LibraryError("CORRUPT", t("专用目录出现未知文件"));
  const events = path.join(directory, "events");
  const stat = await fs.lstat(events);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (await fs.realpath(events)) !== events
  )
    throw new LibraryError("CORRUPT", t("events 必须是专用目录内的真实子目录"));
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
        t("icons 必须是专用目录内的真实子目录"),
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
    throw new LibraryError("CORRUPT", t("拒绝非普通文件或符号链接"));
  if (before.size > max) throw new LibraryError("LIMIT", t("文件超过大小上限"));
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.ino !== before.ino || stat.dev !== before.dev)
      throw new LibraryError("CORRUPT", t("文件在读取前发生变化"));
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
    if (size > max) throw new LibraryError("LIMIT", t("文件超过大小上限"));
    return new TextDecoder("utf-8", { fatal: true }).decode(
      buffer.subarray(0, size),
    );
  } finally {
    await handle.close();
  }
}

async function scan(
  directory: string,
): Promise<{ events: LibraryEvent[]; bytes: number }> {
  const folder = await checkedDirectory(directory);
  const names = (await fs.readdir(folder)).filter(
    (name) => name !== ".DS_Store",
  );
  if (names.length > MAX_EVENTS * 2)
    throw new LibraryError("LIMIT", t("目录文件数超过上限"));
  if (names.filter((name) => !TEMP.test(name)).length > MAX_EVENTS)
    throw new LibraryError("LIMIT", t("事件数超过 10,000 上限"));
  let bytes = 0;
  const events: LibraryEvent[] = [];
  for (const name of names.sort()) {
    const file = path.join(folder, name);
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new LibraryError("CORRUPT", t("事件目录包含非普通文件"));
    if (TEMP.test(name)) continue;
    if (!name.endsWith(".json") || !UUID.test(name.slice(0, -5)))
      throw new LibraryError("CORRUPT", t("事件目录包含未知正式文件"));
    bytes += stat.size;
    if (bytes > MAX_TOTAL_BYTES || events.length >= MAX_EVENTS)
      throw new LibraryError("LIMIT", t("事件库超过首版容量上限"));
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
      throw new LibraryError("CORRUPT", t`事件无效：${name}`);
    }
    if (`${event.eventId}.json` !== name)
      throw new LibraryError("CORRUPT", t("事件文件名与内容不一致"));
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
      coveredVisits: Object.create(null),
      visitEventIds: Object.create(null),
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
    throw new LibraryError("LIMIT", t("事务超过 10 MiB，未写入"));
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
      throw new LibraryError("WRITE_FAILED", t("目录在写入时发生变化"));
    await fs.link(temp, final);
    published = true;
    try {
      await cleanup(temp);
    } catch {
      if ((await readBounded(final, MAX_EVENT_BYTES)) !== data)
        throw new LibraryError(
          "WRITE_FAILED",
          t("发布后核验失败；不要自动重试，请重新读取"),
        );
      return { cleanupWarning: t("本地已写入；临时文件清理失败，未重试提交") };
    }
    return {};
  } catch (e) {
    if (!published) await fs.unlink(temp).catch(() => undefined);
    if (e instanceof LibraryError) throw e;
    throw new LibraryError(
      "WRITE_FAILED",
      published
        ? t("可能已写入，请重新读取，禁止自动重试")
        : t("未发布事件：文件系统不支持安全发布、无权限或文件已存在"),
    );
  }
}
export interface CommitRequest {
  mutations: Mutation[];
  visits?: Visit[];
  expectedHeads: Heads;
  /** Only authoritative shared-file imports may replace the usage snapshot. */
  replaceUsage?: boolean;
}
export interface CommitResult {
  eventId: string;
  state: LibraryState;
  localWritten: true;
  warning?: string;
  sharedSyncPaused?: boolean;
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
      t("数据已变化，请重新打开表单或预览"),
    );
  if (state.status !== "ready" && !resolving)
    throw new LibraryError("CONFLICT", t("存在未解决冲突，全库暂停普通写入"));
  if (resolving && request.visits?.length) invalid(t("解决冲突不能追加访问"));
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
      throw new LibraryError("STALE_HEADS", t("实体父版本已变化"));
    if (m.entity === "bookmark") {
      const bookmark = m.value as Bookmark;
      const bases = events.flatMap((e) =>
        e.mutations.filter(
          (old) =>
            m.baseHeads.includes(e.eventId) &&
            old.entity === "bookmark" &&
            old.entityId === m.entityId,
        ),
      );
      const coverage = (ids?: string[]) => canonical([...(ids ?? [])].sort());
      if (request.replaceUsage === true) {
        if (
          coverage(m.coveredVisits) !==
          coverage(state.visitEventIds?.[m.entityId])
        )
          invalid(t("权威访问统计必须覆盖全部历史访问事件"));
      } else if (
        bases.length
          ? !bases.some((base) => {
              const value = base.value as Bookmark;
              return (
                value.visits === bookmark.visits &&
                value.lastUsed === bookmark.lastUsed &&
                coverage(base.coveredVisits) === coverage(m.coveredVisits) &&
                (!m.removed || base.removed === true)
              );
            })
          : !!m.coveredVisits?.length || m.removed === true
      )
        invalid(t("编辑不能修改访问基数或覆盖范围；请选择已有版本"));
    }
  }
  const next = replayEvents([...events, event]);
  if (next.status !== "ready")
    throw new LibraryError(
      "CONFLICT",
      t("事务未解决所有冲突或产生无效分类引用，未写入"),
    );
  const size = Buffer.byteLength(canonical(event));
  if (
    events.length >= MAX_EVENTS ||
    bytes + size > MAX_TOTAL_BYTES ||
    size > MAX_EVENT_BYTES
  )
    throw new LibraryError("LIMIT", t("事务或事件库超过容量上限，未写入"));
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
  return withSharedJsonWrite(
    directory,
    () =>
      writeTransaction(
        directory,
        { mutations: resolutions, expectedHeads },
        true,
      ),
    { resolving: true },
  );
}
