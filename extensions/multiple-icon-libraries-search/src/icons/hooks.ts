import { AI, Cache, environment, LocalStorage, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AI_PAUSE_MS,
  AiTrigger,
  DEFAULT_MODEL,
  LOWER_COST_MODEL,
  isRateLimitError,
  keywordPrompt,
  modelOrder,
  parseKeywords,
  pickedModel,
  pruneCallTimes,
  shouldAskAi,
  withinRateLimit,
} from "./ai";
import { askAi } from "./ai-call";
import { startRefresh } from "./catalog-loader";
import { isStale, readCatalog } from "./catalog-store";
import { LIBRARY_IDS } from "./libraries";
import { adoptPins, PinsFile, pinsPath, readPins, updatePins as updatePinsFile, watchPins } from "./pins-file";
import { normalizePhrase, prepareSearch, SavedKeywords, SearchItem } from "./search";
import { Uses } from "./stores";
import { Catalog, LibraryId } from "./types";

const cache = new Cache();

export interface CatalogState {
  catalog?: Catalog;
  items: SearchItem[];
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

/**
 * The library's catalog: the saved copy at once, then a background download when it is a day old.
 * Offline, the saved copy simply stays.
 */
export function useCatalog(library: LibraryId): CatalogState {
  const [catalogs, setCatalogs] = useState<Partial<Record<LibraryId, Catalog>>>(() => ({
    [library]: readCatalog(environment.supportPath, library),
  }));
  const [loading, setLoading] = useState<Partial<Record<LibraryId, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<LibraryId, string>>>({});
  const catalog = catalogs[library];

  const run = useCallback(async (target: LibraryId, manual: boolean) => {
    const toast = manual ? await showToast({ style: Toast.Style.Animated, title: "Refreshing icons…" }) : undefined;
    setLoading((current) => ({ ...current, [target]: true }));
    try {
      const fresh = await startRefresh(target);
      setCatalogs((current) => ({ ...current, [target]: fresh }));
      setErrors((current) => ({ ...current, [target]: undefined }));
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = `${fresh.icons.length.toLocaleString()} icons up to date`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrors((current) => ({ ...current, [target]: message }));
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't refresh icons";
        toast.message = message;
      }
    } finally {
      setLoading((current) => ({ ...current, [target]: false }));
    }
  }, []);

  useEffect(() => {
    const saved = catalogs[library] ?? readCatalog(environment.supportPath, library);
    if (saved && !catalogs[library]) setCatalogs((current) => ({ ...current, [library]: saved }));
    if (isStale(saved, Date.now())) void run(library, false);
  }, [library]);

  const items = useMemo(() => (catalog ? prepareSearch(catalog.icons) : []), [catalog]);
  return {
    catalog,
    items,
    isLoading: Boolean(loading[library]) && !catalog,
    error: catalog ? undefined : errors[library],
    refresh: () => run(library, true),
  };
}

export interface LibraryMemory {
  loaded: boolean;
  /** Icons marked as favorites. Stored as pins in the pins file, their name before 2026-11-08. */
  favorites: string[];
  uses: Uses;
  saved: SavedKeywords;
  /**
   * Changes the favorites as they are on disk now, so edits made outside the command are kept. Returns
   * the new favorites, or undefined when saving failed (a toast says so).
   */
  updateFavorites: (update: (favorites: string[]) => string[]) => string[] | undefined;
  setUses: (uses: Uses) => void;
  setSaved: (saved: SavedKeywords) => void;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Moves pins an earlier version kept in LocalStorage into the pins file, for every library at once, and
 * creates the file if it is missing. Runs once per launch.
 */
let adopted: Promise<void> | undefined;
function adoptLegacyPins(path: string): Promise<void> {
  adopted ??= (async () => {
    const legacy: PinsFile = {};
    for (const library of LIBRARY_IDS) {
      const names = await readJson<string[] | undefined>(`pins:${library}`, undefined);
      if (names) legacy[library] = names;
    }
    if (!Object.keys(legacy).length && existsSync(path)) return;
    try {
      adoptPins(path, legacy);
      await Promise.all(Object.keys(legacy).map((library) => LocalStorage.removeItem(`pins:${library}`)));
    } catch {
      // The old pins stay in LocalStorage and are tried again next launch.
      adopted = undefined;
    }
  })();
  return adopted;
}

async function loadPins(path: string, library: LibraryId): Promise<string[]> {
  await adoptLegacyPins(path);
  return readPins(path, library);
}

/** Favorites (in the pins file), use counts, and saved AI keywords (in LocalStorage), per library. */
export function useLibraryMemory(library: LibraryId): LibraryMemory {
  const [state, setState] = useState<{ library?: LibraryId; pins: string[]; uses: Uses; saved: SavedKeywords }>({
    pins: [],
    uses: {},
    saved: {},
  });
  const path = pinsPath(environment.supportPath);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadPins(path, library),
      readJson<Uses>(`uses:${library}`, {}),
      readJson<SavedKeywords>(`keywords:${library}`, {}),
    ]).then(([pins, uses, saved]) => {
      if (!cancelled) setState({ library, pins, uses, saved });
    });
    // Raycast keeps the command warm between opens, so pick up pins changed outside it.
    const stopWatching = watchPins(path, () => {
      if (!cancelled) setState((current) => ({ ...current, pins: readPins(path, library) }));
    });
    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [library]);

  const updatePins = (update: (pins: string[]) => string[]) => {
    try {
      const next = updatePinsFile(path, library, update);
      setState((current) => ({ ...current, pins: next }));
      return next;
    } catch (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save favorites",
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  };

  const persist =
    <K extends "uses" | "saved">(field: K, key: string) =>
    (value: (typeof state)[K]) => {
      setState((current) => ({ ...current, [field]: value }));
      void LocalStorage.setItem(`${key}:${library}`, JSON.stringify(value));
    };

  // Stable between renders, so tiles that depend on it re-render only when something changed.
  return useMemo(
    () => ({
      loaded: state.library === library,
      favorites: state.pins,
      uses: state.uses,
      saved: state.saved,
      updateFavorites: updatePins,
      setUses: persist("uses", "uses"),
      setSaved: persist("saved", "keywords"),
    }),
    [state, library],
  );
}

export interface AiState {
  /** The normalized query these results answer. */
  query: string;
  status: "loading" | "done" | "error";
  /** What started the call: a typing pause with few matches, or Tab. */
  trigger: Exclude<AiTrigger, "none">;
  keywords: string[];
  error?: string;
}

const AI_CACHE_PREFIX = "ai-keywords:";
const AI_CALLS_KEY = "ai-calls";
const AI_MODEL_KEY = "ai-model";

/**
 * Asks the picked model, then Raycast's default, since plans differ in which models they include and Raycast
 * retires models over time. The model that answered is remembered per pick and tried first next time.
 */
async function askAnyModel(prompt: string, signal: AbortSignal, setting: string): Promise<string> {
  const key = `${AI_MODEL_KEY}:${pickedModel(setting)}`;
  const remembered = JSON.parse(cache.get(key) ?? "{}") as { model?: string; at?: number };
  let failure: unknown;
  for (const model of modelOrder(setting, remembered.model, remembered.at ?? 0, Date.now())) {
    try {
      const options = model === DEFAULT_MODEL ? {} : { model: model as AI.Model };
      const reply = await askAi("icons-ai-suggest", prompt, { creativity: "low", signal, ...options });
      if (model !== remembered.model) cache.set(key, JSON.stringify({ model, at: Date.now() }));
      return reply;
    } catch (error) {
      if (signal.aborted || isRateLimitError(error)) throw error;
      failure = error;
    }
  }
  throw failure;
}

function cachedKeywords(phrase: string): string[] | undefined {
  const raw = cache.get(AI_CACHE_PREFIX + phrase);
  return raw ? (JSON.parse(raw) as string[]) : undefined;
}

/** Raycast AI comes with Raycast Pro. Without it there are no AI Results and no Tab, and the search bar doesn't mention meaning. */
export function canUseRaycastAi(): boolean {
  return environment.canAccess(AI);
}

/**
 * AI keywords for a query: from the cache, or asked of Raycast AI within its limits. `onAsking` runs just
 * before a call goes out. Undefined without Raycast AI, for an empty query, or when `signal` aborted it.
 */
export async function aiKeywordsFor(
  query: string,
  trigger: AiState["trigger"],
  model: string,
  signal: AbortSignal,
  onAsking?: () => void,
): Promise<AiState | undefined> {
  const key = normalizePhrase(query);
  if (!key || !canUseRaycastAi()) return undefined;
  const hit = cachedKeywords(key);
  if (hit) return { query: key, status: "done", trigger, keywords: hit };
  const now = Date.now();
  const calls = pruneCallTimes(JSON.parse(cache.get(AI_CALLS_KEY) ?? "[]") as number[], now);
  if (!withinRateLimit(calls, now)) {
    return {
      query: key,
      status: "error",
      trigger,
      keywords: [],
      error: "Raycast AI limit reached. Try again in a minute.",
    };
  }
  cache.set(AI_CALLS_KEY, JSON.stringify([...calls, now]));
  onAsking?.();
  try {
    const keywords = parseKeywords(await askAnyModel(keywordPrompt(query), signal, model));
    cache.set(AI_CACHE_PREFIX + key, JSON.stringify(keywords));
    return signal.aborted ? undefined : { query: key, status: "done", trigger, keywords };
  } catch (error) {
    if (signal.aborted) return undefined;
    return {
      query: key,
      status: "error",
      trigger,
      keywords: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * AI keyword suggestions for the query. Runs once typing pauses and keywords found less than a row, or at once
 * when `requestNow` is called (Tab). Answers are cached per query; calls stay within Raycast's limits.
 * `model` is the AI Model setting.
 */
export function useAiKeywords(searchText: string, keywordMatches: number, auto = true, model = LOWER_COST_MODEL) {
  const canUseAi = useMemo(canUseRaycastAi, []);
  const [state, setState] = useState<AiState | undefined>();
  const controller = useRef<AbortController | undefined>(undefined);
  const phrase = normalizePhrase(searchText);

  const ask = useCallback(
    async (query: string, trigger: AiState["trigger"]) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const loading = { query: normalizePhrase(query), status: "loading" as const, trigger, keywords: [] };
      const result = await aiKeywordsFor(query, trigger, model, abort.signal, () => setState(loading));
      if (result && !abort.signal.aborted) setState(result);
    },
    [model],
  );

  // Automatic AI: only after a pause, only when keywords found little.
  useEffect(() => {
    if (shouldAskAi(phrase, keywordMatches, false, auto) !== "auto" || state?.query === phrase) return;
    const timer = setTimeout(() => void ask(searchText, "auto"), AI_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [phrase, keywordMatches, auto]);

  // A changed query makes any running call moot.
  useEffect(() => () => controller.current?.abort(), [phrase]);

  const ai = state?.query === phrase ? state : undefined;
  return {
    canUseAi,
    ai,
    /** AI is working, or will start once the typing pause ends. */
    aiPending:
      ai?.status === "loading" || (canUseAi && !ai && shouldAskAi(phrase, keywordMatches, false, auto) === "auto"),
    requestNow: () => void ask(searchText, "tab"),
  };
}
