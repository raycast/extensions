import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Cache } from "@raycast/api";
import { DayOneCliError, runCli } from "./cli";
import { isDemo } from "./demo";
import { entryTitle, Place, timeZoneOrUndefined } from "./parse";

// Only the fields this extension reads. The CLI returns much more (locations, weather, revisions); none of it is kept.

export type Journal = { id: string; name: string; color?: string; encrypted: boolean };

type RawJournal = { id: string; name: string; color?: string; encryption?: unknown };

export type Entry = {
  id: string;
  journalId: string;
  /** Always derived from the text. The CLI's own `title` is the raw first line: `![](dayone-moment://…)` for an entry that opens with a photo, and Markdown escapes like `\\.` left in. */
  title: string;
  body: string;
  date: number;
  timeZone?: string;
  tags: string[];
  starred: boolean;
  place?: Place;
  /** Photos and audio recordings attached to the entry. The CLI can't download them yet (DayOne-Cli#39). */
  photos: number;
  audio: number;
};

type RawLocation = {
  placeName?: string;
  localityName?: string;
  administrativeArea?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

type RawEntry = {
  id: string;
  title?: string;
  body?: string;
  date: number;
  timeZone?: string | null;
  tags?: string[];
  starred?: boolean;
  revision?: { journalId?: string };
  location?: RawLocation | null;
  moments?: { type?: string }[] | null;
};

type Page<T> = { ok: boolean; count: number; has_more: boolean; next_cursor: string | null; items: T[] };

function toEntry(raw: RawEntry, journalId?: string): Entry {
  return {
    id: raw.id,
    journalId: raw.revision?.journalId ?? journalId ?? "",
    title: entryTitle(raw.body || raw.title || ""),
    body: raw.body ?? "",
    date: raw.date,
    timeZone: timeZoneOrUndefined(raw.timeZone),
    tags: raw.tags ?? [],
    starred: raw.starred ?? false,
    place: raw.location
      ? {
          name: raw.location.placeName,
          locality: raw.location.localityName,
          area: raw.location.administrativeArea,
          country: raw.location.country,
          latitude: raw.location.latitude,
          longitude: raw.location.longitude,
        }
      : undefined,
    photos: (raw.moments ?? []).filter((m) => m.type === "image").length,
    audio: (raw.moments ?? []).filter((m) => m.type === "audio").length,
  };
}

export async function listJournals(): Promise<Journal[]> {
  const journals: Journal[] = [];
  let cursor: string | null = null;
  do {
    const args: string[] = ["list", "journals", "--limit", "100", ...(cursor ? ["--cursor", cursor] : [])];
    const page: Page<RawJournal> = await runCli<Page<RawJournal>>(args);
    // `encryption` is "plaintext", or an object describing the vault key for end-to-end encrypted journals.
    journals.push(
      ...page.items.map(({ id, name, color, encryption }) => ({
        id,
        name,
        color,
        encrypted: encryption !== "plaintext",
      })),
    );
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return journals;
}

export type SearchOptions = {
  query?: string;
  journalIds?: string[];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  favorite?: boolean;
  /** Exact `placeName` matches, the CLI's `--place` filter. */
  places?: string[];
  limit?: number;
  sort?: "relevancy" | "entryDate" | "editDate";
};

export type SearchHit = { entry: Entry; similarity?: number };

/** Semantic search. With no query, lists the newest entries (the CLI needs a filter, so it gets an open date range). */
export async function searchEntries(options: SearchOptions): Promise<SearchHit[]> {
  const query = options.query?.trim();
  const args = ["search", "entries", "--limit", String(options.limit ?? 30)];
  if (query) args.push("--query", query);
  for (const id of options.journalIds ?? []) args.push("--journal-id", id);
  for (const tag of options.tags ?? []) args.push("--tag", tag);
  if (options.dateFrom) args.push("--date-from", options.dateFrom);
  if (options.dateTo) args.push("--date-to", options.dateTo);
  if (options.favorite) args.push("--favorite");
  for (const place of options.places ?? []) args.push("--place", place);
  const hasFilter = Boolean(
    options.places?.length ||
    options.journalIds?.length ||
    options.tags?.length ||
    options.dateFrom ||
    options.dateTo ||
    options.favorite,
  );
  if (!query && !hasFilter) args.push("--date-from", "0");
  args.push("--sort", options.sort ?? (query ? "relevancy" : "entryDate"));
  const result = await runCli<{ items: { similarity?: number; item: RawEntry }[] }>(args);
  return result.items.map(({ similarity, item }) => ({
    entry: toEntry(item),
    similarity: query ? similarity : undefined,
  }));
}

export async function readEntry(journalId: string, entryId: string): Promise<Entry> {
  const result = await runCli<{ journal_id: string; entry: RawEntry }>([
    "entry",
    "read",
    "--journal-id",
    journalId,
    "--entry-id",
    entryId,
  ]);
  return toEntry(result.entry, result.journal_id);
}

export type WriteResult = { entryId: string; journalId: string };

/** Writes to the local store and queues the upload. The body goes in on stdin. */
export async function writeEntry(input: { journalId: string; body: string; date?: Date }): Promise<WriteResult> {
  const args = ["entry", "write", "--journal-id", input.journalId, "--body-stdin"];
  if (input.date) args.push("--date", input.date.toISOString());
  const result = await runCli<{ entry_id: string; journal_id: string }>(args, { input: input.body });
  return { entryId: result.entry_id, journalId: result.journal_id };
}

export type Account = {
  signedIn: boolean;
  name?: string;
  plan?: string;
  /** Day One's Daily Chat replies are a Gold feature. Messages themselves work on every plan. */
  dailyChat?: boolean;
};

type Feature = { name: string; enabled?: boolean };

/** `auth whoami` returns the whole account record. Only the name and plan are kept; the rest (email, IDs, key fingerprint) is dropped here. */
export async function whoami(): Promise<Account> {
  try {
    const result = await runCli<{
      ok: boolean;
      user?: {
        display_name?: string;
        feature_bundle?: { bundle_name?: string; features?: Feature[] };
      };
    }>(["auth", "whoami"]);
    if (!result.ok || !result.user) return { signedIn: false };
    return {
      signedIn: true,
      name: result.user.display_name,
      plan: result.user.feature_bundle?.bundle_name,
      dailyChat: result.user.feature_bundle?.features?.some((f) => f.name === "aiDailyChat" && f.enabled === true),
    };
  } catch (error) {
    if (error instanceof DayOneCliError && error.kind === "auth") return { signedIn: false };
    throw error;
  }
}

export async function login(email: string, password: string): Promise<{ plan?: string }> {
  const result = await runCli<{ ok: boolean; user?: { feature_bundle?: { bundle_name?: string } } }>(
    ["auth", "login", "--email", email, "--password-stdin"],
    { input: password },
  );
  return { plan: result.user?.feature_bundle?.bundle_name };
}

export async function setEncryptionKey(key: string): Promise<void> {
  await runCli(["auth", "key-set", "--key-stdin"], { input: key });
}

/** Signs out and deletes this device's local copy of the journals. Callers must check the outbox is empty first. */
export async function logout(): Promise<void> {
  await runCli(["auth", "logout", "--force"]);
  forgetCachedResults();
}

/**
 * Raycast keeps each `useCachedPromise` hook's last results, full entries included, in its own folder under the
 * cache directory. Sign-out deletes those folders so the next account never sees them. The loose files beside them
 * are settings (sidebar, journal order), so they stay.
 */
function forgetCachedResults(): void {
  if (isDemo()) return;
  const root = new Cache().storageDirectory;
  if (!existsSync(root)) return;
  for (const item of readdirSync(root, { withFileTypes: true })) {
    if (item.isDirectory()) rmSync(join(root, item.name), { recursive: true, force: true });
  }
}

export type DoctorCheck = { check: string; status: string; summary: string; details?: Record<string, unknown> };
export type DoctorReport = { status: string; checks: DoctorCheck[] };

/** `dayone doctor` in its default, shareable mode: no journal or entry IDs. */
export async function runDoctor(): Promise<DoctorReport> {
  return runCli<DoctorReport>(["doctor"]);
}

export type TelemetryStatus = { consent: string; permitted: boolean; disabled_by_environment: boolean };

export async function telemetryStatus(): Promise<TelemetryStatus> {
  return runCli<TelemetryStatus>(["telemetry", "status"]);
}

export async function setTelemetry(enabled: boolean): Promise<void> {
  await runCli(["telemetry", enabled ? "enable" : "disable"]);
}

export type ScheduleStatus = {
  backend: string;
  registered: boolean;
  enabled: boolean;
  interval_minutes: number | null;
};

export async function scheduleStatus(): Promise<ScheduleStatus> {
  return runCli<ScheduleStatus>(["sync-schedule", "status"]);
}

export async function setSchedule(enabled: boolean): Promise<void> {
  await runCli(enabled ? ["sync-schedule", "enable", "--interval-minutes", "30"] : ["sync-schedule", "disable"]);
}

/** Day One's plans page, for features the account's plan doesn't include. */
export const PLANS_URL = "https://dayoneapp.com/plans/";

/** Opens the Day One app's Daily Chat (Mac). */
export const DAILY_CHAT_DEEP_LINK = "dayone://daily-chat";

export async function addDailyChatMessage(message: string, date?: string): Promise<void> {
  await runCli(["daily-chat", "add", "--message-stdin", ...(date ? ["--date", date] : [])], { input: message });
}
