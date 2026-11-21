import type { Emote, Provider } from "./providers";
import type { EmoteStorage } from "./saved-emotes";

export interface SearchPreferences {
  selection: string;
  isGridView: boolean;
  animatedOnly: boolean;
}
export const DEFAULT_SEARCH_PREFERENCES: SearchPreferences = {
  selection: "7tv:popular",
  isGridView: true,
  animatedOnly: false,
};
const PREFERENCES_KEY = "search_preferences_v1";

export function createSearchPreferencesStore(
  storage: EmoteStorage,
  validSelections: readonly string[],
) {
  let state = { ...DEFAULT_SEARCH_PREFERENCES };
  let loading: Promise<void> | undefined;
  let pending = Promise.resolve();
  function normalize(value: unknown): SearchPreferences {
    const raw =
      value && typeof value === "object"
        ? (value as Partial<SearchPreferences>)
        : {};
    return {
      selection:
        typeof raw.selection === "string" &&
        validSelections.includes(raw.selection)
          ? raw.selection
          : DEFAULT_SEARCH_PREFERENCES.selection,
      isGridView: typeof raw.isGridView === "boolean" ? raw.isGridView : true,
      animatedOnly:
        typeof raw.animatedOnly === "boolean" ? raw.animatedOnly : false,
    };
  }
  async function load() {
    loading ??= (async () => {
      const saved = await storage.getItem(PREFERENCES_KEY);
      state = normalize(saved === undefined ? undefined : JSON.parse(saved));
    })();
    await loading;
    return state;
  }
  function update(patch: Partial<SearchPreferences>) {
    const operation = pending.then(async () => {
      await load();
      const next = normalize({ ...state, ...patch });
      await storage.setItem(PREFERENCES_KEY, JSON.stringify(next));
      state = next;
      return state;
    });
    pending = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
  return { load, update };
}

export function getSavedEmoteMatches(
  favorites: Emote[],
  history: Emote[],
  filter: { provider: Provider; query: string; animatedOnly: boolean },
  keyForEmote: (emote: Emote) => string,
) {
  const query = filter.query.trim().toLowerCase();
  const matches = (emote: Emote) =>
    (emote.provider ?? "7tv") === filter.provider &&
    (!filter.animatedOnly || emote.animated) &&
    emote.name.toLowerCase().includes(query);
  const matchingFavorites = favorites.filter(matches);
  const favoriteKeys = new Set(matchingFavorites.map(keyForEmote));
  return {
    favorites: matchingFavorites,
    history: history.filter(
      (emote) => matches(emote) && !favoriteKeys.has(keyForEmote(emote)),
    ),
  };
}
