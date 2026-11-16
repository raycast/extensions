import { LocalStorage } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import type { CompanySummary } from "./types";

const MAX_RECENTS = 15;

type State = { favorites: CompanySummary[]; recents: CompanySummary[]; loaded: boolean };

let state: State = { favorites: [], recents: [], loaded: false };
const listeners = new Set<() => void>();
let loading: Promise<void> | undefined;

// Pushed views run in the same process as the root list, so a module-level store keeps every view in sync.
function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

async function read(key: string): Promise<CompanySummary[]> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    return raw ? (JSON.parse(raw) as CompanySummary[]) : [];
  } catch {
    return [];
  }
}

// The favorites key predates the switch to US spelling; renaming it would drop saved favorites.
const STORAGE_KEYS = { favorites: "favourites", recents: "recents" } as const;

function load() {
  loading ??= Promise.all([read(STORAGE_KEYS.favorites), read(STORAGE_KEYS.recents)]).then(([favorites, recents]) =>
    setState({ favorites, recents, loaded: true }),
  );
  return loading;
}

/** Saves first and updates the views only once the write succeeded, so the UI never shows unsaved state. */
async function persist(key: keyof typeof STORAGE_KEYS, value: CompanySummary[]) {
  await LocalStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  setState({ [key]: value });
}

function slim(company: CompanySummary): CompanySummary {
  return { orgnr: company.orgnr, name: company.name, form: company.form ?? null, city: company.city ?? null };
}

export async function trackRecent(company: CompanySummary) {
  await load();
  await persist(
    "recents",
    [slim(company), ...state.recents.filter((c) => c.orgnr !== company.orgnr)].slice(0, MAX_RECENTS),
  );
}

export async function removeRecent(orgnr: string) {
  await load();
  await persist(
    "recents",
    state.recents.filter((c) => c.orgnr !== orgnr),
  );
}

export async function clearRecents() {
  await load();
  await persist("recents", []);
}

export async function toggleFavorite(company: CompanySummary): Promise<boolean> {
  await load();
  const isFavorite = state.favorites.some((c) => c.orgnr === company.orgnr);
  await persist(
    "favorites",
    isFavorite ? state.favorites.filter((c) => c.orgnr !== company.orgnr) : [...state.favorites, slim(company)],
  );
  return !isFavorite;
}

export async function moveFavorite(orgnr: string, direction: -1 | 1) {
  await load();
  const list = [...state.favorites];
  const index = list.findIndex((c) => c.orgnr === orgnr);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  await persist("favorites", list);
}

export function useStore(): State {
  useEffect(() => {
    void load();
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
