import { LocalStorage } from "@raycast/api";
import { currentGoogleConnectionFingerprint, listCalendars } from "./google";
import { GoogleCalendarEntry } from "./types";

export type CalendarRole = "personal" | "work" | "shared" | "family";
export type CalendarRoleMap = Partial<Record<CalendarRole, string>>;
export type RoutingKeywordMap = Partial<Record<CalendarRole, string[]>>;
export type CalendarSelectionMode = "custom" | "google" | "all";

const STORAGE = {
  accountScopeIndex: "calendar-shortcuts.account-scope-index.v1",

  // Account-scoped v2 storage. These base keys are combined with a stable
  // account scope derived from the connected account's primary calendar.
  scheduleEnabledCalendarIds:
    "calendar-shortcuts.schedule-enabled-calendar-ids.v2",
  menuBarEnabledCalendarIds:
    "calendar-shortcuts.menu-bar-enabled-calendar-ids.v2",
  calendarRoles: "calendar-shortcuts.calendar-roles.v2",
  routingKeywords: "calendar-shortcuts.routing-keywords.v2",
  setupComplete: "calendar-shortcuts.setup-complete.v2",

  // Old unscoped keys are deliberately not used as fallbacks. Once more than
  // one Google account has been connected, there is no safe way to know which
  // account those values belonged to. They are removed by the dev reset.
  legacyEnabledCalendarIds: "calendar-shortcuts.enabled-calendar-ids.v1",
  legacyScheduleEnabledCalendarIds:
    "calendar-shortcuts.schedule-enabled-calendar-ids.v1",
  legacyMenuBarEnabledCalendarIds:
    "calendar-shortcuts.menu-bar-enabled-calendar-ids.v1",
  legacyCalendarRoles: "calendar-shortcuts.calendar-roles.v1",
  legacyRoutingKeywords: "calendar-shortcuts.routing-keywords.v1",
  legacySetupComplete: "calendar-shortcuts.setup-complete.v1",
} as const;

const ROLES: CalendarRole[] = ["personal", "work", "shared", "family"];

type AccountScopeIndex = Record<string, string>;

let accountScopeCache: {
  connectionFingerprint: string;
  promise: Promise<string>;
} | null = null;

// Raycast LocalStorage is shared by the extension. Keep JSON writes ordered so
// multiple settings saved together cannot race and leave only part of a setup
// transaction persisted.
let localStorageWriteQueue: Promise<void> = Promise.resolve();

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const payload = JSON.stringify(value);
  const write = localStorageWriteQueue.then(() =>
    LocalStorage.setItem(key, payload),
  );

  // Keep later writes moving even if one write fails, while still propagating
  // the original failure to the caller that initiated it.
  localStorageWriteQueue = write.catch(() => {});
  await write;
}

async function readCalendarIds(key: string): Promise<string[] | null> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : null;
  } catch {
    return null;
  }
}

async function resolveConnectedAccountScope(): Promise<string> {
  const connectionFingerprint = currentGoogleConnectionFingerprint();

  if (
    accountScopeCache &&
    accountScopeCache.connectionFingerprint === connectionFingerprint
  ) {
    return accountScopeCache.promise;
  }

  const promise = (async () => {
    const index = await readJson<AccountScopeIndex>(
      STORAGE.accountScopeIndex,
      {},
    );
    const knownScope = index[connectionFingerprint];
    if (knownScope) return knownScope;

    const calendars = await listCalendars();
    const primary = calendars.find((calendar) => calendar.primary);

    if (!primary?.id) {
      throw new Error(
        "Could not identify the connected Google Calendar account.",
      );
    }

    // Do not put an email/calendar id directly into Raycast LocalStorage keys.
    // The primary calendar id is stable for the account, so a deterministic
    // local hash gives us a durable but non-readable scope.
    const scope = stableHash(primary.id.trim().toLowerCase());

    const updated: AccountScopeIndex = {
      ...index,
      [connectionFingerprint]: scope,
    };

    // A user is unlikely to connect many accounts, but keep this housekeeping
    // bounded so repeated developer OAuth tests cannot grow LocalStorage forever.
    const recentEntries = Object.entries(updated).slice(-12);
    await writeJson(
      STORAGE.accountScopeIndex,
      Object.fromEntries(recentEntries),
    );

    return scope;
  })();

  accountScopeCache = { connectionFingerprint, promise };

  try {
    return await promise;
  } catch (error) {
    if (
      accountScopeCache?.connectionFingerprint === connectionFingerprint &&
      accountScopeCache.promise === promise
    ) {
      accountScopeCache = null;
    }
    throw error;
  }
}

async function scopedStorageKey(baseKey: string): Promise<string> {
  return `${baseKey}.account.${await resolveConnectedAccountScope()}`;
}

function normaliseCalendarIds(ids: unknown, label: string): string[] {
  if (!Array.isArray(ids)) {
    throw new Error(`${label} calendar selection was missing.`);
  }

  if (!ids.every((value) => typeof value === "string")) {
    throw new Error(`${label} calendar selection was invalid.`);
  }

  return Array.from(new Set(ids.map((value) => value.trim()).filter(Boolean)));
}

function looksLikeEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function calendarEntryDisplayName(
  calendar: GoogleCalendarEntry,
): string {
  const override = calendar.summaryOverride?.trim();
  if (override) return override;

  const summary = calendar.summary.trim();

  // The primary calendar's stable Google ID is commonly the account email,
  // and some accounts expose that same email as the CalendarList summary.
  // Keep that ID internally, but don't make users treat an email address as a
  // calendar name. If Google provides no friendlier override, use a neutral
  // label rather than guessing another calendar or using account profile data.
  if (calendar.primary && looksLikeEmailAddress(summary)) {
    return "Primary Calendar";
  }

  return summary;
}

export function isGoogleVisible(calendar: GoogleCalendarEntry): boolean {
  if (calendar.accessRole === "none") return false;
  if (calendar.hidden) return false;
  return calendar.primary || calendar.selected !== false;
}

export function googleVisibleCalendarIds(
  calendars: GoogleCalendarEntry[],
): string[] {
  return calendars.filter(isGoogleVisible).map((calendar) => calendar.id);
}

export function allReadableCalendarIds(
  calendars: GoogleCalendarEntry[],
): string[] {
  return calendars
    .filter((calendar) => calendar.accessRole !== "none")
    .map((calendar) => calendar.id);
}

export async function getScheduleEnabledCalendarIds(): Promise<
  string[] | null
> {
  return readCalendarIds(
    await scopedStorageKey(STORAGE.scheduleEnabledCalendarIds),
  );
}

export async function setScheduleEnabledCalendarIds(
  ids: unknown,
): Promise<void> {
  const unique = normaliseCalendarIds(ids, "Schedule");
  await writeJson(
    await scopedStorageKey(STORAGE.scheduleEnabledCalendarIds),
    unique,
  );
}

export async function getMenuBarEnabledCalendarIds(): Promise<string[] | null> {
  return readCalendarIds(
    await scopedStorageKey(STORAGE.menuBarEnabledCalendarIds),
  );
}

export async function setMenuBarEnabledCalendarIds(
  ids: unknown,
): Promise<void> {
  const unique = normaliseCalendarIds(ids, "Menu Bar");
  await writeJson(
    await scopedStorageKey(STORAGE.menuBarEnabledCalendarIds),
    unique,
  );
}

// Backwards-compatible aliases for any older code or development builds that
// still import the original shared selection helpers. They now refer to the
// full Schedule selection, which was the original command's primary purpose.
export async function getEnabledCalendarIds(): Promise<string[] | null> {
  return getScheduleEnabledCalendarIds();
}

export async function setEnabledCalendarIds(ids: string[]): Promise<void> {
  await setScheduleEnabledCalendarIds(ids);
}

export async function getCalendarRoles(): Promise<CalendarRoleMap> {
  return readJson<CalendarRoleMap>(
    await scopedStorageKey(STORAGE.calendarRoles),
    {},
  );
}

export async function setCalendarRoles(roles: CalendarRoleMap): Promise<void> {
  const cleaned: CalendarRoleMap = {};
  for (const role of ROLES) {
    const value = roles[role];
    if (typeof value === "string" && value.trim()) cleaned[role] = value;
  }
  await writeJson(await scopedStorageKey(STORAGE.calendarRoles), cleaned);
}

export async function getRoutingKeywords(): Promise<RoutingKeywordMap> {
  return readJson<RoutingKeywordMap>(
    await scopedStorageKey(STORAGE.routingKeywords),
    {},
  );
}

export async function setRoutingKeywords(
  keywords: RoutingKeywordMap,
): Promise<void> {
  const cleaned: RoutingKeywordMap = {};
  for (const role of ROLES) {
    const values = keywords[role];
    if (!values) continue;
    const unique = Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => value.toLowerCase()),
      ),
    );
    if (unique.length) cleaned[role] = unique;
  }
  await writeJson(await scopedStorageKey(STORAGE.routingKeywords), cleaned);
}

export async function isCalendarSetupComplete(): Promise<boolean> {
  return (
    (await LocalStorage.getItem<string>(
      await scopedStorageKey(STORAGE.setupComplete),
    )) === "true"
  );
}

export async function markCalendarSetupComplete(): Promise<void> {
  await LocalStorage.setItem(
    await scopedStorageKey(STORAGE.setupComplete),
    "true",
  );
}

function accountScopedSetupKeys(scope: string): string[] {
  return [
    STORAGE.scheduleEnabledCalendarIds,
    STORAGE.menuBarEnabledCalendarIds,
    STORAGE.calendarRoles,
    STORAGE.routingKeywords,
    STORAGE.setupComplete,
  ].map((baseKey) => `${baseKey}.account.${scope}`);
}

function legacySetupKeys(): string[] {
  return [
    STORAGE.legacyEnabledCalendarIds,
    STORAGE.legacyScheduleEnabledCalendarIds,
    STORAGE.legacyMenuBarEnabledCalendarIds,
    STORAGE.legacyCalendarRoles,
    STORAGE.legacyRoutingKeywords,
    STORAGE.legacySetupComplete,
  ];
}

function presentStorageKeys(
  items: LocalStorage.Values,
  keys: string[],
): string[] {
  return keys.filter((key) => Object.prototype.hasOwnProperty.call(items, key));
}

async function purgeStorageKeys(keys: string[]): Promise<void> {
  const uniqueKeys = Array.from(new Set(keys));

  // LocalStorage writes share one encrypted extension database. Keep each
  // removal strictly ordered instead of firing a batch of removeItem() calls
  // concurrently. Removal and verification also stay inside the same queue so
  // another settings write from this module cannot slip between them.
  const purge = localStorageWriteQueue.then(async () => {
    for (const key of uniqueKeys) {
      await LocalStorage.removeItem(key);
    }

    let remaining = presentStorageKeys(
      await LocalStorage.allItems(),
      uniqueKeys,
    );

    // If another command instance completed a one-off write at the same moment
    // as the purge, remove exactly those surviving keys once more. This is a
    // deterministic retry of known keys, not a timeout-based workaround.
    if (remaining.length > 0) {
      for (const key of remaining) {
        await LocalStorage.removeItem(key);
      }

      remaining = presentStorageKeys(await LocalStorage.allItems(), uniqueKeys);
    }

    if (remaining.length > 0) {
      // Do not expose account-derived storage keys to the user. The count is
      // enough to distinguish a genuine LocalStorage cleanup failure from an
      // OAuth/disconnect problem.
      throw new Error(
        `DayCal could not remove ${remaining.length} saved setup item${remaining.length === 1 ? "" : "s"}. Please try again.`,
      );
    }
  });

  localStorageWriteQueue = purge.catch(() => {});
  await purge;
}

export async function deleteCurrentAccountCalendarSettings(): Promise<void> {
  const scope = await resolveConnectedAccountScope();
  const index = await readJson<AccountScopeIndex>(
    STORAGE.accountScopeIndex,
    {},
  );
  const setupKeys = [
    ...accountScopedSetupKeys(scope),
    // Older builds used unscoped v1 keys. Current readers do not normally use
    // them, but Delete DayCal Settings means delete the account's setup rather
    // than leave historical routing keywords or selections behind.
    ...legacySetupKeys(),
  ];

  // A single Google account can accumulate multiple access-token fingerprints
  // over time. They all resolve to the same durable primary-calendar scope, so
  // deleting this account's setup also removes every fingerprint that points to
  // that scope. No email address or calendar ID is stored in the index.
  const remainingIndex = Object.fromEntries(
    Object.entries(index).filter(([, indexedScope]) => indexedScope !== scope),
  );

  await purgeStorageKeys(setupKeys);

  if (Object.keys(remainingIndex).length > 0) {
    await writeJson(STORAGE.accountScopeIndex, remainingIndex);
  } else {
    await purgeStorageKeys([STORAGE.accountScopeIndex]);
  }

  // Force a reconnect to resolve the account afresh instead of reusing the
  // in-memory scope promise from the disconnected session.
  accountScopeCache = null;
}

export async function resetCalendarSetup(): Promise<void> {
  const scope = await resolveConnectedAccountScope();
  const setupKeys = [...accountScopedSetupKeys(scope), ...legacySetupKeys()];

  await purgeStorageKeys(setupKeys);
}

export function parseKeywordList(value: unknown): string[] {
  if (typeof value !== "string") {
    throw new Error("Routing keyword field was missing.");
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatKeywordList(values: string[] | undefined): string {
  return (values || []).join(", ");
}

export async function getCalendarSettingsDebugScope(): Promise<string> {
  return resolveConnectedAccountScope();
}

function findWritableByName(
  calendars: GoogleCalendarEntry[],
  names: string[],
): GoogleCalendarEntry | undefined {
  const writable = calendars.filter(
    (calendar) =>
      calendar.accessRole === "owner" || calendar.accessRole === "writer",
  );
  for (const name of names) {
    const lower = name.toLowerCase();
    const exact = writable.find(
      (calendar) => calendarEntryDisplayName(calendar).toLowerCase() === lower,
    );
    if (exact) return exact;
  }
  return undefined;
}

export function defaultRoleSelections(
  calendars: GoogleCalendarEntry[],
): CalendarRoleMap {
  const writable = calendars.filter(
    (calendar) =>
      calendar.accessRole === "owner" || calendar.accessRole === "writer",
  );
  const personal =
    findWritableByName(calendars, ["Personal", "Home"]) ||
    writable.find((calendar) => calendar.primary) ||
    writable[0];
  const work = findWritableByName(calendars, ["Work", "Office"]);
  const shared =
    findWritableByName(calendars, ["Shared", "Couple", "Partner"]) ||
    writable.find((calendar) =>
      /\b(shared|partner|couple)\b/i.test(calendarEntryDisplayName(calendar)),
    ) ||
    writable.find((calendar) =>
      calendarEntryDisplayName(calendar).includes("&"),
    );
  const family = findWritableByName(calendars, ["Family"]);

  return {
    ...(personal ? { personal: personal.id } : {}),
    ...(work ? { work: work.id } : {}),
    ...(shared ? { shared: shared.id } : {}),
    ...(family ? { family: family.id } : {}),
  };
}

export function resolveRoleCalendar(
  calendars: GoogleCalendarEntry[],
  roles: CalendarRoleMap,
  role: CalendarRole,
  fallbackName?: string,
): GoogleCalendarEntry | undefined {
  const configuredId = roles[role];
  if (configuredId) {
    const configured = calendars.find(
      (calendar) => calendar.id === configuredId,
    );
    if (configured) return configured;
  }

  if (fallbackName) {
    const exact = calendars.filter(
      (calendar) =>
        calendar.summary === fallbackName ||
        calendar.summaryOverride === fallbackName,
    );
    if (exact.length === 1) return exact[0];
  }

  if (role === "personal") {
    return calendars.find(
      (calendar) =>
        calendar.primary &&
        (calendar.accessRole === "owner" || calendar.accessRole === "writer"),
    );
  }

  return undefined;
}

export function roleLabel(role: CalendarRole): string {
  switch (role) {
    case "personal":
      return "Personal";
    case "work":
      return "Work";
    case "shared":
      return "Shared";
    case "family":
      return "Family";
  }
}
