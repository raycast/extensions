import type { Emote } from "./providers";

export const FAVORITES_KEY = "favorites_v1";
export const HISTORY_KEY = "history_v1";
export interface EmoteStorage {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}
export interface SavedEmotes {
  favorites: Emote[];
  history: Emote[];
}

export function createSavedEmotesStore(
  storage: EmoteStorage,
  keyForEmote: (emote: Emote) => string,
) {
  let state: SavedEmotes = { favorites: [], history: [] };
  let loading: Promise<void> | undefined;
  let pending = Promise.resolve();

  function parse(value: string | undefined): Emote[] {
    if (value === undefined) return [];
    const items: unknown = JSON.parse(value);
    if (!Array.isArray(items)) throw new Error("Saved emotes must be a list");
    return items as Emote[];
  }
  async function load() {
    loading ??= (async () => {
      const [favorites, history] = await Promise.all([
        storage.getItem(FAVORITES_KEY),
        storage.getItem(HISTORY_KEY),
      ]);
      // Loading never rewrites or removes the installed version's data.
      state = { favorites: parse(favorites), history: parse(history) };
    })();
    await loading;
    return state;
  }
  function update(
    field: keyof SavedEmotes,
    transform: (items: Emote[]) => Emote[],
  ) {
    const operation = pending.then(async () => {
      await load();
      const items = transform(state[field]);
      const key = field === "favorites" ? FAVORITES_KEY : HISTORY_KEY;
      await storage.setItem(key, JSON.stringify(items));
      state = { ...state, [field]: items };
      return state;
    });
    pending = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
  function recordRecent(emote: Emote) {
    return update("history", (items) =>
      [
        emote,
        ...items.filter((e) => keyForEmote(e) !== keyForEmote(emote)),
      ].slice(0, 20),
    );
  }
  function toggleFavorite(emote: Emote) {
    return update("favorites", (items) =>
      items.some((e) => keyForEmote(e) === keyForEmote(emote))
        ? items.filter((e) => keyForEmote(e) !== keyForEmote(emote))
        : [emote, ...items],
    );
  }
  return { load, recordRecent, toggleFavorite };
}
