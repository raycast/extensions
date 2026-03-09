import { LocalStorage, open } from "@raycast/api";
import { execFile } from "node:child_process";
import { isIP } from "node:net";
import { promisify } from "node:util";

export type Mode = "manual" | "saved" | "recent";

export type SavedSet = {
  id: string;
  name: string;
  emoji: string | null;
  tags: string[];
  urls: string;
  createdAt: string;
  updatedAt: string;
  useCount: number;
  pinned: boolean;
  lastOpenedAt: string | null;
  totalOpenedCount: number;
  totalFailedCount: number;
  totalInvalidCount: number;
  browserApp: string | null;
};

export type SharedSetV1 = {
  name: string;
  emoji: string | null;
  tags: string[];
  urls: string[];
  browserApp: string | null;
};

export type ShareEnvelopeV1 = {
  schema: typeof SHARE_SCHEMA_V1;
  exportedAt: string;
  sets: SharedSetV1[];
};

export type HistoryEntry = {
  id: string;
  urls: string;
  createdAt: string;
  openedCount: number;
  invalidCount: number;
  failedCount: number;
  sourceName?: string;
  sourceSetId?: string;
  browserApp: string | null;
};

export type TrashedSet = {
  id: string;
  deletedAt: string;
  sourceSet: SavedSet;
  previousSlots: ShortcutSlotKey[];
};

export type ShortcutSlotKey = "slot1" | "slot2" | "slot3" | "slot4" | "slot5";

export type ShortcutSlots = Record<ShortcutSlotKey, string | null>;

export const SHORTCUT_SLOT_KEYS: ShortcutSlotKey[] = ["slot1", "slot2", "slot3", "slot4", "slot5"];

export const DEFAULT_SHORTCUT_SLOTS: ShortcutSlots = {
  slot1: null,
  slot2: null,
  slot3: null,
  slot4: null,
  slot5: null,
};

export const STORAGE_KEYS = {
  savedSets: "multi-url.saved-sets.v2",
  history: "multi-url.history.v2",
  slots: "multi-url.shortcut-slots.v1",
  trash: "multi-url.trash.v1",
} as const;

export const KNOWN_BROWSER_APPS = [
  "Safari",
  "Google Chrome",
  "Arc",
  "Brave Browser",
  "Firefox",
  "Microsoft Edge",
  "Orion",
] as const;

export const SHARE_SCHEMA_V1 = "multi-url.share.v1";
export const SHARE_CODE_PREFIX = "multiurl://";

const execFileAsync = promisify(execFile);
const OPEN_BATCH_SIZE = 20;
export const MAX_HISTORY_ITEMS = 5;
export const MAX_TRASH_ITEMS = 5;
export const MAX_URLS_PER_RUN = 80;
const TRACKING_PARAM_PREFIXES = ["utm_", "ga_", "pk_", "matomo_"] as const;
const TRACKING_PARAM_KEYS = new Set<string>([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "igshid",
  "rb_clickid",
  "vero_conv",
  "vero_id",
  "_hsenc",
  "_hsmi",
  "wickedid",
  "yclid",
  "zanpid",
]);
function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalTimestamp(date: Date, separator = ":"): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hour = padDatePart(date.getHours());
  const minute = padDatePart(date.getMinutes());

  return `${year}-${month}-${day} ${hour}${separator}${minute}`;
}

export function formatSetTimestamp(date: Date): string {
  return formatLocalTimestamp(date, "-");
}

export function splitInput(input: string): string[] {
  const rows = input
    .split(/\r?\n|;|\t/)
    .map((line) => line.trim())
    .filter(Boolean);

  const values: string[] = [];
  for (const row of rows) {
    if (!row.includes(",")) {
      values.push(row);
      continue;
    }

    const schemeMatches = row.match(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\//g)?.length ?? 0;
    const shouldSplitByComma = schemeMatches !== 1 || !row.includes("://");

    if (!shouldSplitByComma) {
      values.push(row);
      continue;
    }

    values.push(
      ...row
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }

  return values;
}

function stripListSyntax(value: string): string {
  return value
    .trim()
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^<(.+)>$/, "$1");
}

function hasScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value);
}

function looksLikeHostCandidate(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.startsWith("localhost")) {
    return true;
  }

  if (value.includes(".")) {
    return true;
  }

  return false;
}

function isAllowedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") {
    return true;
  }

  if (isIP(hostname) > 0) {
    return true;
  }

  return hostname.includes(".");
}

function shouldDropTrackingParam(key: string): boolean {
  const normalized = key.toLowerCase();
  if (TRACKING_PARAM_KEYS.has(normalized)) {
    return true;
  }

  return TRACKING_PARAM_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function normalizeDomain(parsed: URL): void {
  parsed.hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }
}

function stripTrackingQueryParams(parsed: URL): void {
  if (!parsed.search) {
    return;
  }

  const nextParams = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (shouldDropTrackingParam(key)) {
      continue;
    }

    nextParams.append(key, value);
  }

  parsed.search = nextParams.toString() ? `?${nextParams.toString()}` : "";
}

export function normalizeUrl(raw: string): string | null {
  const candidate = stripListSyntax(raw);
  if (!candidate) {
    return null;
  }

  const inputHasScheme = hasScheme(candidate);
  if (!inputHasScheme && !looksLikeHostCandidate(candidate)) {
    return null;
  }

  const withScheme = inputHasScheme ? candidate : `https://${candidate}`;

  try {
    const parsed = new URL(withScheme);
    normalizeDomain(parsed);
    if (!parsed.hostname || !isAllowedHostname(parsed.hostname)) {
      return null;
    }
    stripTrackingQueryParams(parsed);

    return parsed.toString();
  } catch {
    return null;
  }
}

export function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return unique;
}

export function sortSavedSets(savedSets: SavedSet[]): SavedSet[] {
  return [...savedSets].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

function normalizeTagValue(value: string): string | null {
  const normalized = value.trim().replace(/^#+/, "").replace(/\s+/g, " ").toLowerCase();

  return normalized.length > 0 ? normalized : null;
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const tag of tags) {
    const normalized = normalizeTagValue(tag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

export function parseTagInput(rawInput: string): string[] {
  return normalizeTags(rawInput.split(/[\r\n,;]+/));
}

export function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function formatDateTime(value: string): string {
  try {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return formatLocalTimestamp(parsedDate);
  } catch {
    return value;
  }
}

export function ensureSetName(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  return `Set ${formatSetTimestamp(new Date())}`;
}

export function resolveBrowserApp(choice: string, customBrowserApp: string): string | null {
  if (choice === "default") {
    return null;
  }

  if (choice === "custom") {
    const value = customBrowserApp.trim();
    return value.length > 0 ? value : null;
  }

  return choice;
}

export function browserChoiceFromApp(browserApp: string | null): {
  browserChoice: string;
  customBrowserApp: string;
} {
  if (!browserApp) {
    return { browserChoice: "default", customBrowserApp: "" };
  }

  if (KNOWN_BROWSER_APPS.includes(browserApp as (typeof KNOWN_BROWSER_APPS)[number])) {
    return { browserChoice: browserApp, customBrowserApp: "" };
  }

  return { browserChoice: "custom", customBrowserApp: browserApp };
}

export async function openInBrowser(urls: string[], browserApp: string | null): Promise<string[]> {
  const failures: string[] = [];

  for (let i = 0; i < urls.length; i += OPEN_BATCH_SIZE) {
    const chunk = urls.slice(i, i + OPEN_BATCH_SIZE);

    try {
      const args = browserApp ? ["-a", browserApp, ...chunk] : chunk;
      await execFileAsync("/usr/bin/open", args);
      continue;
    } catch {
      for (const url of chunk) {
        try {
          await open(url, browserApp ?? undefined);
        } catch {
          failures.push(url);
        }
      }
    }
  }

  return failures;
}

export function parseInputUrls(rawInput: string): {
  uniqueValid: string[];
  invalid: string[];
} {
  const entries = splitInput(rawInput);

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const entry of entries) {
    const normalized = normalizeUrl(entry);
    if (normalized) {
      valid.push(normalized);
    } else {
      invalid.push(entry);
    }
  }

  return {
    uniqueValid: dedupe(valid),
    invalid,
  };
}

function encodeShareEnvelope(envelope: ShareEnvelopeV1): string {
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

function decodeSharePayload(rawInput: string): unknown {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Paste a share code first.");
  }

  if (trimmed.startsWith("{")) {
    return parseJson(trimmed, null);
  }

  const compact = trimmed.replace(SHARE_CODE_PREFIX, "").replace(/\s+/g, "");
  if (!compact) {
    throw new Error("Share code is empty.");
  }

  try {
    return parseJson(Buffer.from(compact, "base64url").toString("utf8"), null);
  } catch {
    try {
      return parseJson(Buffer.from(compact, "base64").toString("utf8"), null);
    } catch {
      throw new Error("Share code could not be decoded.");
    }
  }
}

function normalizeSharedBrowserApp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSharedSet(value: unknown): SharedSetV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    name?: unknown;
    emoji?: unknown;
    tags?: unknown;
    urls?: unknown;
    browserApp?: unknown;
  };
  const name = typeof candidate.name === "string" ? ensureSetName(candidate.name) : "";
  const emoji =
    typeof candidate.emoji === "string" && candidate.emoji.trim().length > 0 ? candidate.emoji.trim() : null;
  const tags = Array.isArray(candidate.tags)
    ? normalizeTags(candidate.tags.filter((tag): tag is string => typeof tag === "string"))
    : [];

  const urlValues: string[] = [];
  if (typeof candidate.urls === "string") {
    urlValues.push(candidate.urls);
  } else if (Array.isArray(candidate.urls)) {
    for (const entry of candidate.urls) {
      if (typeof entry === "string") {
        urlValues.push(entry);
      }
    }
  }

  const parsed = parseInputUrls(urlValues.join("\n"));
  if (parsed.uniqueValid.length === 0) {
    return null;
  }

  return {
    name: name.length > 0 ? name : ensureSetName(""),
    emoji,
    tags,
    urls: parsed.uniqueValid,
    browserApp: normalizeSharedBrowserApp(candidate.browserApp),
  };
}

function buildShareFingerprint(urls: string[], tags: string[], browserApp: string | null): string {
  const normalizedUrls = dedupe(
    urls.map((entry) => normalizeUrl(entry)).filter((entry): entry is string => Boolean(entry)),
  );
  const normalizedBrowser = browserApp?.trim().toLowerCase() ?? "default";
  const normalizedTags = normalizeTags(tags);

  return JSON.stringify({
    urls: normalizedUrls,
    browserApp: normalizedBrowser,
    tags: normalizedTags,
  });
}

export function createSharedSetFingerprint(sharedSet: SharedSetV1): string {
  return buildShareFingerprint(sharedSet.urls, sharedSet.tags, sharedSet.browserApp);
}

export function createSavedSetShareFingerprint(savedSet: SavedSet): string {
  const parsed = parseInputUrls(savedSet.urls);
  return buildShareFingerprint(parsed.uniqueValid, savedSet.tags, savedSet.browserApp);
}

export function parseSharedSetsInput(rawInput: string): SharedSetV1[] {
  const decoded = decodeSharePayload(rawInput);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Share code format is invalid.");
  }

  const envelope = decoded as {
    schema?: unknown;
    sets?: unknown;
  };
  if (envelope.schema !== SHARE_SCHEMA_V1) {
    throw new Error("Unsupported share code version.");
  }

  if (!Array.isArray(envelope.sets)) {
    throw new Error("Share code does not contain any URL-sets.");
  }

  const seenFingerprints = new Set<string>();
  const normalizedSets: SharedSetV1[] = [];

  for (const entry of envelope.sets) {
    const normalized = normalizeSharedSet(entry);
    if (!normalized) {
      continue;
    }

    const fingerprint = createSharedSetFingerprint(normalized);
    if (seenFingerprints.has(fingerprint)) {
      continue;
    }

    seenFingerprints.add(fingerprint);
    normalizedSets.push(normalized);
  }

  if (normalizedSets.length === 0) {
    throw new Error("No valid URL-sets found in the share code.");
  }

  return normalizedSets;
}

function toSharedSet(savedSet: SavedSet): SharedSetV1 | null {
  const parsed = parseInputUrls(savedSet.urls);
  if (parsed.uniqueValid.length === 0) {
    return null;
  }

  return {
    name: ensureSetName(savedSet.name),
    emoji: savedSet.emoji ?? null,
    tags: normalizeTags(savedSet.tags),
    urls: parsed.uniqueValid,
    browserApp: savedSet.browserApp ?? null,
  };
}

export function createShareCodeFromSavedSet(savedSet: SavedSet): string {
  return createShareCodeFromSavedSets([savedSet]);
}

export function createShareCodeFromSavedSets(savedSets: SavedSet[]): string {
  const seenFingerprints = new Set<string>();
  const normalizedSets: SharedSetV1[] = [];

  for (const savedSet of savedSets) {
    const sharedSet = toSharedSet(savedSet);
    if (!sharedSet) {
      continue;
    }

    const fingerprint = createSharedSetFingerprint(sharedSet);
    if (seenFingerprints.has(fingerprint)) {
      continue;
    }

    seenFingerprints.add(fingerprint);
    normalizedSets.push(sharedSet);
  }

  if (normalizedSets.length === 0) {
    throw new Error("No valid URL-sets available to export.");
  }

  const envelope: ShareEnvelopeV1 = {
    schema: SHARE_SCHEMA_V1,
    exportedAt: new Date().toISOString(),
    sets: normalizedSets,
  };

  return `${SHARE_CODE_PREFIX}${encodeShareEnvelope(envelope)}`;
}

function normalizeSavedSets(raw: SavedSet[]): SavedSet[] {
  return raw.map((item) => ({
    ...item,
    emoji: item.emoji ?? null,
    tags: normalizeTags(item.tags ?? []),
    pinned: item.pinned ?? false,
    lastOpenedAt: item.lastOpenedAt ?? null,
    totalOpenedCount: item.totalOpenedCount ?? 0,
    totalFailedCount: item.totalFailedCount ?? 0,
    totalInvalidCount: item.totalInvalidCount ?? 0,
    browserApp: item.browserApp ?? null,
  }));
}

function normalizeHistory(raw: HistoryEntry[]): HistoryEntry[] {
  return raw.map((item) => ({
    ...item,
    sourceSetId: item.sourceSetId,
    browserApp: item.browserApp ?? null,
  }));
}

function normalizeTrash(raw: TrashedSet[]): TrashedSet[] {
  return raw.map((item) => ({
    ...item,
    sourceSet: normalizeSavedSets([item.sourceSet])[0],
    previousSlots: item.previousSlots ?? [],
  }));
}

export async function loadSavedSets(): Promise<SavedSet[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.savedSets);
  const parsed = parseJson<SavedSet[]>(raw, []);
  return normalizeSavedSets(parsed);
}

export async function saveSavedSets(savedSets: SavedSet[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.savedSets, JSON.stringify(savedSets));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.history);
  const parsed = parseJson<HistoryEntry[]>(raw, []);
  const nextHistory = normalizeHistory(parsed).slice(0, MAX_HISTORY_ITEMS);

  if (parsed.length > MAX_HISTORY_ITEMS) {
    await saveHistory(nextHistory);
  }

  return nextHistory;
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

export async function loadTrash(): Promise<TrashedSet[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.trash);
  const parsed = parseJson<TrashedSet[]>(raw, []);
  const nextTrash = normalizeTrash(parsed)
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    .slice(0, MAX_TRASH_ITEMS);

  if (parsed.length > MAX_TRASH_ITEMS) {
    await saveTrash(nextTrash);
  }

  return nextTrash;
}

export async function saveTrash(trash: TrashedSet[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.trash, JSON.stringify(trash));
}

export async function loadShortcutSlots(): Promise<ShortcutSlots> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.slots);
  const mergedSlots = {
    ...DEFAULT_SHORTCUT_SLOTS,
    ...parseJson<ShortcutSlots>(raw, DEFAULT_SHORTCUT_SLOTS),
  };
  const normalizedSlots = normalizeShortcutSlots(mergedSlots);

  if (JSON.stringify(mergedSlots) !== JSON.stringify(normalizedSlots)) {
    await saveShortcutSlots(normalizedSlots);
  }

  return normalizedSlots;
}

export async function saveShortcutSlots(slots: ShortcutSlots): Promise<void> {
  const normalizedSlots = normalizeShortcutSlots({
    ...DEFAULT_SHORTCUT_SLOTS,
    ...slots,
  });
  await LocalStorage.setItem(STORAGE_KEYS.slots, JSON.stringify(normalizedSlots));
}

export function normalizeShortcutSlots(slots: ShortcutSlots): ShortcutSlots {
  const nextSlots: ShortcutSlots = {
    ...DEFAULT_SHORTCUT_SLOTS,
    ...slots,
  };
  const seenSetIds = new Set<string>();

  for (const slot of SHORTCUT_SLOT_KEYS) {
    const setId = nextSlots[slot];
    if (!setId) {
      nextSlots[slot] = null;
      continue;
    }

    if (seenSetIds.has(setId)) {
      nextSlots[slot] = null;
      continue;
    }

    seenSetIds.add(setId);
  }

  return nextSlots;
}

export function toggleSetQuickUrlSlot(slots: ShortcutSlots, setId: string, targetSlot: ShortcutSlotKey): ShortcutSlots {
  const nextSlots = normalizeShortcutSlots(slots);
  const wasMappedToTargetSlot = nextSlots[targetSlot] === setId;

  for (const slot of SHORTCUT_SLOT_KEYS) {
    if (nextSlots[slot] === setId) {
      nextSlots[slot] = null;
    }
  }

  if (!wasMappedToTargetSlot) {
    nextSlots[targetSlot] = setId;
  }

  return nextSlots;
}

export function applySavedSetRunStats(
  set: SavedSet,
  run: { openedCount: number; failedCount: number; invalidCount: number },
  at = new Date().toISOString(),
): SavedSet {
  return {
    ...set,
    useCount: set.useCount + 1,
    updatedAt: at,
    lastOpenedAt: at,
    totalOpenedCount: set.totalOpenedCount + run.openedCount,
    totalFailedCount: set.totalFailedCount + run.failedCount,
    totalInvalidCount: set.totalInvalidCount + run.invalidCount,
  };
}

export function getSetFailureRate(set: SavedSet): number {
  const total = set.totalOpenedCount + set.totalFailedCount + set.totalInvalidCount;

  if (total === 0) {
    return 0;
  }

  return (set.totalFailedCount + set.totalInvalidCount) / total;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function createUniqueSetName(desiredName: string, existingNames: string[]): string {
  const normalize = (value: string) => value.trim().toLowerCase();
  const taken = new Set(existingNames.map(normalize));
  const baseName = desiredName.trim();

  if (!taken.has(normalize(baseName))) {
    return baseName;
  }

  let index = 2;
  while (taken.has(normalize(`${baseName} (${index})`))) {
    index += 1;
  }

  return `${baseName} (${index})`;
}
