import { LocalStorage } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import type { CompanySummary } from "./types";

const MAX_RECENTS = 15;

type State = { favourites: CompanySummary[]; recents: CompanySummary[]; loaded: boolean };

let state: State = { favourites: [], recents: [], loaded: false };
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

function load() {
  loading ??= Promise.all([read("favourites"), read("recents")]).then(([favourites, recents]) =>
    setState({ favourites, recents, loaded: true }),
  );
  return loading;
}

function persist(key: "favourites" | "recents", value: CompanySummary[]) {
  setState({ [key]: value });
  void LocalStorage.setItem(key, JSON.stringify(value));
}

function slim(company: CompanySummary): CompanySummary {
  return { orgnr: company.orgnr, name: company.name, form: company.form ?? null, city: company.city ?? null };
}

export async function trackRecent(company: CompanySummary) {
  await load();
  persist("recents", [slim(company), ...state.recents.filter((c) => c.orgnr !== company.orgnr)].slice(0, MAX_RECENTS));
}

export async function removeRecent(orgnr: string) {
  await load();
  persist(
    "recents",
    state.recents.filter((c) => c.orgnr !== orgnr),
  );
}

export async function clearRecents() {
  await load();
  persist("recents", []);
}

export async function toggleFavourite(company: CompanySummary): Promise<boolean> {
  await load();
  const isFavourite = state.favourites.some((c) => c.orgnr === company.orgnr);
  persist(
    "favourites",
    isFavourite ? state.favourites.filter((c) => c.orgnr !== company.orgnr) : [...state.favourites, slim(company)],
  );
  return !isFavourite;
}

export async function moveFavourite(orgnr: string, direction: -1 | 1) {
  await load();
  const list = [...state.favourites];
  const index = list.findIndex((c) => c.orgnr === orgnr);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  persist("favourites", list);
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
