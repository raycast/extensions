import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { ApiClient, ApiError } from "../vendor/jovida/api.js";
import { Session, NotSignedInError } from "../vendor/jovida/session.js";
import { SyncClient } from "../vendor/jovida/sync.js";
import { loadConfig, platformName } from "../vendor/jovida/config.js";
import * as state from "../vendor/jovida/state.js";
import {
  toDraft,
  mergeDraft,
  mergeRepeat,
  toFullTodo,
  toListItem,
  toSeriesTodo,
  belongDateToSec,
  normalizeRepeatUnit,
  parseWeekdays,
} from "../vendor/jovida/core/convert.js";
import {
  expandRecurring,
  parseOccurrenceId,
  ymdFromSec,
  seriesOccursOn,
  occurrenceToEntry,
} from "../vendor/jovida/core/recurrence.js";
import { newEntryId, newRecurringId } from "../vendor/jovida/core/ids.js";
import {
  CreateInput,
  JovidaError,
  JovidaErrorCode,
  ListOptions,
  ListResult,
  Todo,
  UpdateInput,
  WhoAmI,
} from "./types";

// Re-export so existing imports of these from "./jovida" keep working.
export { JovidaError } from "./types";

const K_TOKEN = "jovida.token";
const K_VER = "jovida.lastServerVersion";
const K_DID = "jovida.deviceId";
const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);

// ---- context: hydrate state from LocalStorage, build api/session/sync, flush after ----

async function getDeviceId(): Promise<string> {
  let id = await LocalStorage.getItem<string>(K_DID);
  if (!id) {
    id = `dvc_${randomUUID().replace(/-/g, "")}`;
    await LocalStorage.setItem(K_DID, id);
  }
  return id;
}

interface Ctx {
  api: InstanceType<typeof ApiClient>;
  session: InstanceType<typeof Session>;
  sync: InstanceType<typeof SyncClient>;
  baseUrl: string;
}

async function makeCtx(): Promise<Ctx> {
  const deviceId = await getDeviceId();
  const tokenRaw = await LocalStorage.getItem<string>(K_TOKEN);
  const verRaw = await LocalStorage.getItem<string>(K_VER);
  state.__hydrate({
    token: tokenRaw ? JSON.parse(tokenRaw) : null,
    lastServerVersion: verRaw ? Number(verRaw) : 0,
    deviceId,
  });
  const cfg = loadConfig();
  const api = new ApiClient({
    baseUrl: cfg.baseUrl,
    appId: cfg.appId,
    deviceId,
    platform: platformName(),
  });
  const session = new Session(api);
  const sync = new SyncClient(api);
  return { api, session, sync, baseUrl: cfg.baseUrl };
}

async function flush(): Promise<void> {
  if (!state.__dirty()) return;
  const s = state.__snapshot();
  if (s.token) await LocalStorage.setItem(K_TOKEN, JSON.stringify(s.token));
  else await LocalStorage.removeItem(K_TOKEN);
  await LocalStorage.setItem(K_VER, String(s.lastServerVersion));
}

function mapError(e: unknown): JovidaError {
  if (e instanceof JovidaError) return e;
  if (e instanceof NotSignedInError)
    return new JovidaError("NOT_SIGNED_IN", e.message, 2);
  if (e instanceof ApiError) {
    if (e.status === 0) return new JovidaError("NETWORK", e.message, 3);
    if (e.status === 401 || e.status === 403)
      return new JovidaError("NOT_SIGNED_IN", e.message, 2);
    if (e.status === 404 || e.reason === "NOT_FOUND")
      return new JovidaError("NOT_FOUND", e.message, 4);
    return new JovidaError("SERVER_ERROR", e.message, 3);
  }
  return new JovidaError(
    "UNKNOWN",
    e instanceof Error ? e.message : String(e),
    1,
  );
}

async function withCtx<T>(fn: (ctx: Ctx) => Promise<T>): Promise<T> {
  const ctx = await makeCtx();
  try {
    return await fn(ctx);
  } catch (e) {
    throw mapError(e);
  } finally {
    await flush();
  }
}

// ---- draft → internal objects (ported from commands/shared.js) ----

function draftToEntry(d: Record<string, unknown>) {
  const t = nowSec();
  return {
    entryId: newEntryId(),
    title: d.title,
    description: d.description ?? "",
    category: d.category ?? "",
    priority: d.priority ?? "none",
    dueAt: d.dueAt ?? 0,
    belongAt: d.belongAt ?? 0,
    recurringId: "",
    occurrenceAt: 0,
    subtasks: d.subtasks ?? [],
    reminder: d.reminder ?? null,
    completedAt: 0,
    createdAt: t,
    updatedAt: t,
    hint: d.hint ?? "",
  };
}

function draftToRecurring(d: Record<string, unknown>) {
  const t = nowSec();
  return {
    recurringId: newRecurringId(),
    title: d.title,
    description: d.description ?? "",
    category: d.category ?? "",
    priority: d.priority ?? "none",
    dueAt: d.dueAt ?? 0,
    belongAt: d.belongAt ?? 0,
    subtasks: d.subtasks ?? [],
    reminder: d.reminder ?? null,
    repeat: d.repeat,
    createdAt: t,
    updatedAt: t,
  };
}

// ---- public API (same surface as before; now in-process over HTTP) ----

export async function whoami(): Promise<WhoAmI> {
  return withCtx((ctx) => ctx.session.whoami());
}

export async function isSignedIn(): Promise<boolean> {
  try {
    const me = await whoami();
    return Boolean(me?.vitaId);
  } catch {
    return false;
  }
}

export async function list(opts: ListOptions = {}): Promise<ListResult> {
  return withCtx(async (ctx) => {
    await ctx.session.ensureSession();
    const snap = await ctx.sync.pull();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = Math.floor(today.getTime() / 1000);
    const tomorrowStart = todayStart + DAY;

    const hasFilter = !!(opts.query || opts.category || opts.priority);
    const scope = opts.scope ?? (hasFilter ? "all" : "today");
    const status = opts.status ?? (hasFilter ? "all" : "pending");
    const limit = opts.limit ?? 20;

    const rangeFrom = opts.from ? belongDateToSec(opts.from) : todayStart;
    const rangeTo = opts.to
      ? belongDateToSec(opts.to) + DAY - 1
      : Number.POSITIVE_INFINITY;

    const virtuals = expandRecurring({
      recurrings: snap.recurrings,
      realEntries: snap.entries,
      scope,
      status,
      todayStart,
      tomorrowStart,
      rangeFrom,
      rangeTo,
      horizonDays: 90,
      collapseHorizonDays: 366 * 5,
    });

    const anchorSec = (e: { dueAt: number; belongAt: number }) =>
      e.dueAt > 0 ? e.dueAt : e.belongAt;

    let items = [...snap.entries, ...virtuals];
    items = items.filter((e) =>
      status === "all"
        ? true
        : status === "completed"
          ? e.completedAt > 0
          : e.completedAt === 0,
    );
    if (scope === "today") {
      items = items.filter(
        (e) => anchorSec(e) > 0 && anchorSec(e) < tomorrowStart,
      );
    } else if (scope === "upcoming") {
      items = items.filter((e) => anchorSec(e) >= tomorrowStart);
    } else if (scope === "range") {
      const f = opts.from ? belongDateToSec(opts.from) : 0;
      const t = opts.to
        ? belongDateToSec(opts.to) + DAY
        : Number.POSITIVE_INFINITY;
      items = items.filter((e) => anchorSec(e) >= f && anchorSec(e) < t);
    }
    if (opts.query) {
      const q = opts.query.toLowerCase();
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }
    if (opts.category)
      items = items.filter((e) => e.category === opts.category);
    if (opts.priority)
      items = items.filter((e) => e.priority === opts.priority);

    if (scope === "recent") items.sort((x, y) => y.updatedAt - x.updatedAt);
    else
      items.sort(
        (x, y) =>
          (anchorSec(x) || Number.POSITIVE_INFINITY) -
          (anchorSec(y) || Number.POSITIVE_INFINITY),
      );

    const total = items.length;
    const shown = items.slice(0, limit);
    const seriesById = new Map(snap.recurrings.map((s) => [s.recurringId, s]));
    const todos = opts.full
      ? shown.map((e) =>
          toFullTodo(
            e,
            e.recurringId ? seriesById.get(e.recurringId)?.repeat : undefined,
          ),
        )
      : shown.map(toListItem);
    return { todos, total, has_more: total > shown.length } as ListResult;
  });
}

export async function view(id: string): Promise<Todo> {
  return withCtx(async (ctx) => {
    await ctx.session.ensureSession();
    const snap = await ctx.sync.pull();
    const entry = snap.entries.find((x) => x.entryId === id);
    if (entry) {
      const repeat = entry.recurringId
        ? snap.recurrings.find((s) => s.recurringId === entry.recurringId)
            ?.repeat
        : undefined;
      return toFullTodo(entry, repeat) as Todo;
    }
    const occ = parseOccurrenceId(id);
    if (occ) {
      const s = snap.recurrings.find((x) => x.recurringId === occ.recurringId);
      const day = ymdFromSec(occ.occurrenceSec);
      if (s && seriesOccursOn(s, day))
        return toFullTodo(occurrenceToEntry(s, day), s.repeat) as Todo;
    }
    const series = snap.recurrings.find((s) => s.recurringId === id);
    if (series) return toSeriesTodo(series) as unknown as Todo;
    throw new JovidaError("NOT_FOUND", `todo not found: ${id}`, 4);
  });
}

export async function create(
  input: CreateInput,
): Promise<{ entry_id?: string; recurring_id?: string; status: string }> {
  return withCtx(async (ctx) => {
    if (!input.title || !input.title.trim()) {
      throw new JovidaError("USAGE", "A todo needs a non-empty title.", 1);
    }
    let repeat;
    if (input.repeat) {
      const unit = normalizeRepeatUnit(input.repeat);
      if (!unit)
        throw new JovidaError(
          "USAGE",
          "repeat must be one of: day, week, month, year",
          1,
        );
      if (!input.when)
        throw new JovidaError(
          "USAGE",
          "a repeating todo needs a date (when)",
          1,
        );
      repeat = {
        unit,
        interval: input.every,
        weekdays: parseWeekdays(input.weekdays),
        day_of_month: input.dayOfMonth,
        month_of_year: input.monthOfYear,
        until: input.until,
      };
    }
    const draft = toDraft({
      title: input.title,
      when: input.when,
      priority: input.priority,
      category: input.category,
      description: input.description,
      remind_at:
        input.reminders && input.reminders.length ? input.reminders : undefined,
      subtasks:
        input.subtasks && input.subtasks.length
          ? input.subtasks.map((s) => ({ title: s }))
          : undefined,
      hint: input.hint,
      repeat,
    });
    await ctx.session.ensureSession();
    if (repeat) {
      const series = draftToRecurring(draft);
      await ctx.sync.putRecurrings([series]);
      return { recurring_id: series.recurringId, status: "created" };
    }
    const entry = draftToEntry(draft);
    await ctx.sync.putEntries([entry]);
    return { entry_id: entry.entryId, status: "created" };
  });
}

function applyContentClears(o: Record<string, unknown>, a: UpdateInput) {
  if (a.clearWhen) {
    o.dueAt = 0;
    o.belongAt = 0;
    o.reminder = null;
  }
  if (a.clearRemind) o.reminder = null;
  if (a.clearCategory) o.category = "";
  if (a.clearDesc) o.description = "";
  if (a.clearSubtasks) o.subtasks = [];
}

export async function update(
  id: string,
  input: UpdateInput,
): Promise<{ status: string }> {
  return withCtx(async (ctx) => {
    const repeatTouched =
      input.repeat !== undefined ||
      input.every !== undefined ||
      input.weekdays !== undefined ||
      input.dayOfMonth !== undefined ||
      input.monthOfYear !== undefined ||
      input.until !== undefined ||
      input.clearUntil === true;
    let repeatChanges: Record<string, unknown> | undefined;
    if (repeatTouched) {
      let unit;
      if (input.repeat !== undefined) {
        unit = normalizeRepeatUnit(input.repeat);
        if (!unit)
          throw new JovidaError(
            "USAGE",
            "repeat must be one of: day, week, month, year",
            1,
          );
      }
      repeatChanges = {
        unit,
        interval: input.every,
        weekdays: parseWeekdays(input.weekdays),
        day_of_month: input.dayOfMonth,
        month_of_year: input.monthOfYear,
        until: input.until,
      };
    }

    const changes: Record<string, unknown> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.when !== undefined) changes.when = input.when;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.category !== undefined) changes.category = input.category;
    if (input.description !== undefined)
      changes.description = input.description;
    if (input.reminders !== undefined) changes.remind_at = input.reminders;
    if (input.subtasks !== undefined)
      changes.subtasks = input.subtasks.map((s) => ({ title: s }));
    if (input.hint !== undefined) changes.hint = input.hint;

    await ctx.session.ensureSession();
    const snap = await ctx.sync.pull();

    const entry = snap.entries.find((x) => x.entryId === id);
    if (entry) {
      if (repeatTouched) {
        throw new JovidaError(
          "USAGE",
          entry.recurringId
            ? `Can't change the repeat rule from a single occurrence — edit the routine via its recurring_id (${entry.recurringId}).`
            : "This todo doesn't repeat. Create a repeating todo instead.",
          1,
        );
      }
      const d = mergeDraft(entry, changes);
      const updated = {
        ...entry,
        title: d.title,
        description: d.description ?? "",
        category: d.category ?? "",
        priority: d.priority ?? "none",
        dueAt: d.dueAt ?? 0,
        belongAt: d.belongAt ?? 0,
        subtasks: d.subtasks ?? [],
        reminder: d.reminder ?? null,
        hint: d.hint ?? "",
        updatedAt: nowSec(),
      };
      applyContentClears(updated, input);
      if (input.clearHint) updated.hint = "";
      await ctx.sync.putEntries([updated]);
      return { entry_id: updated.entryId, status: "updated" };
    }

    const series = snap.recurrings.find((s) => s.recurringId === id);
    if (series) {
      const pseudo = {
        entryId: series.recurringId,
        title: series.title,
        description: series.description,
        category: series.category,
        priority: series.priority,
        dueAt: series.dueAt,
        belongAt: series.belongAt,
        recurringId: "",
        occurrenceAt: 0,
        subtasks: series.subtasks,
        reminder: series.reminder,
        completedAt: 0,
        createdAt: series.createdAt,
        updatedAt: series.updatedAt,
        hint: "",
      };
      const d = mergeDraft(pseudo, changes);
      const updated = {
        ...series,
        title: d.title,
        description: d.description ?? "",
        category: d.category ?? "",
        priority: d.priority ?? "none",
        dueAt: d.dueAt ?? 0,
        belongAt: d.belongAt ?? 0,
        subtasks: d.subtasks ?? [],
        reminder: d.reminder ?? null,
        repeat: repeatChanges
          ? mergeRepeat(series.repeat, repeatChanges)
          : series.repeat,
        updatedAt: nowSec(),
      };
      applyContentClears(updated, input);
      if (input.clearUntil) updated.repeat = { ...updated.repeat, endAt: 0 };
      await ctx.sync.putRecurrings([updated]);
      return { recurring_id: updated.recurringId, status: "updated" };
    }

    const occ = parseOccurrenceId(id);
    if (occ) {
      const s = snap.recurrings.find((x) => x.recurringId === occ.recurringId);
      const day = ymdFromSec(occ.occurrenceSec);
      if (s && seriesOccursOn(s, day)) {
        if (repeatTouched) {
          throw new JovidaError(
            "USAGE",
            `Can't change the repeat rule of a single occurrence — edit the routine via its recurring_id (${s.recurringId}).`,
            1,
          );
        }
        const base = occurrenceToEntry(s, day);
        const d = mergeDraft(base, changes);
        const forked = {
          ...base,
          title: d.title,
          description: d.description ?? "",
          category: d.category ?? "",
          priority: d.priority ?? "none",
          dueAt: d.dueAt ?? 0,
          belongAt: d.belongAt ?? 0,
          subtasks: d.subtasks ?? [],
          reminder: d.reminder ?? null,
          hint: d.hint ?? "",
          updatedAt: nowSec(),
        };
        applyContentClears(forked, input);
        if (input.clearHint) forked.hint = "";
        await ctx.sync.putEntries([forked]);
        return { entry_id: forked.entryId, status: "updated" };
      }
    }

    throw new JovidaError("NOT_FOUND", `todo not found: ${id}`, 4);
  });
}

async function setCompleted(
  ids: string[],
  completed: boolean,
): Promise<{ status: string }> {
  return withCtx(async (ctx) => {
    await ctx.session.ensureSession();
    const snap = await ctx.sync.pull();
    const t = nowSec();
    const out: Record<string, unknown>[] = [];
    const missing: string[] = [];
    for (const id of ids) {
      const e = snap.entries.find((x) => x.entryId === id);
      if (e) {
        out.push({ ...e, completedAt: completed ? t : 0, updatedAt: t });
        continue;
      }
      if (completed) {
        const occ = parseOccurrenceId(id);
        const s =
          occ && snap.recurrings.find((x) => x.recurringId === occ.recurringId);
        if (occ && s && seriesOccursOn(s, ymdFromSec(occ.occurrenceSec))) {
          const forked = occurrenceToEntry(s, ymdFromSec(occ.occurrenceSec));
          out.push({ ...forked, completedAt: t, updatedAt: t });
          continue;
        }
      }
      missing.push(id);
    }
    if (missing.length)
      throw new JovidaError(
        "NOT_FOUND",
        `todo not found: ${missing.join(", ")}`,
        4,
      );
    await ctx.sync.putEntries(out);
    return { status: completed ? "completed" : "reopened" };
  });
}

export async function complete(ids: string[]): Promise<{ status: string }> {
  return setCompleted(ids, true);
}

export async function reopen(ids: string[]): Promise<{ status: string }> {
  return setCompleted(ids, false);
}

export async function remove(ids: string[]): Promise<{ status: string }> {
  return withCtx(async (ctx) => {
    await ctx.session.ensureSession();
    const occIds = ids.filter((id) => parseOccurrenceId(id));
    if (occIds.length) {
      const snap = await ctx.sync.pull();
      const real = new Set(snap.entries.map((e) => e.entryId));
      const notReal = occIds.filter((id) => !real.has(id));
      const hasSeries = (id: string) => {
        const o = parseOccurrenceId(id);
        return (
          !!o && snap.recurrings.some((s) => s.recurringId === o.recurringId)
        );
      };
      const unmaterialized = notReal.filter(hasSeries);
      if (unmaterialized.length) {
        throw new JovidaError(
          "USAGE",
          `Cannot delete an un-materialized occurrence of a repeating todo (${unmaterialized.join(", ")}). To stop the routine, delete its recurring_id.`,
          1,
        );
      }
      const unknown = notReal.filter((id) => !hasSeries(id));
      if (unknown.length)
        throw new JovidaError(
          "NOT_FOUND",
          `todo not found: ${unknown.join(", ")}`,
          4,
        );
    }
    await ctx.sync.deleteObjects(ids);
    return { status: "deleted" };
  });
}

// Fully remove a repeating todo regardless of id form (series id, embedded id,
// or occurrence id). delete is idempotent server-side, so we just hard-delete
// every candidate id.
export async function deleteRepeating(
  entryId: string,
  recurringId?: string | null,
): Promise<{ status: string }> {
  return withCtx(async (ctx) => {
    await ctx.session.ensureSession();
    const ids = new Set<string>([entryId]);
    if (recurringId) ids.add(recurringId);
    const m = entryId.match(/^recurring:(.+):\d+$/);
    if (m) ids.add(m[1]);
    await ctx.sync.deleteObjects([...ids]);
    return { status: "deleted" };
  });
}

// ---- sign-in (device authorization flow over HTTP) ----

export async function signIn(onUrl: (url: string) => void): Promise<void> {
  await withCtx(async (ctx) => {
    await ctx.session.loginWithDeviceFlow(
      (d: { verificationUriComplete?: string; verificationUri?: string }) => {
        const url = d.verificationUriComplete || d.verificationUri;
        if (url) onUrl(url);
      },
    );
  });
}

// JovidaErrorCode re-export for consumers that import the type from here.
export type { JovidaErrorCode };
