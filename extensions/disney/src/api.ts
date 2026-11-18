export type Appearance = { kind: "films" | "tvShows"; title: string };

export type Character = {
  _id: number;
  name: string;
  sourceUrl?: string;
  imageUrl?: string;
  films: string[];
  shortFilms: string[];
  tvShows: string[];
  videoGames: string[];
  parkAttractions: string[];
  allies: string[];
  enemies: string[];
};

export type CharacterFilters = { name?: string; films?: string; tvShows?: string };
export type CharacterPage = { data: Character[]; hasMore: boolean };

export function buildCharacterUrl(filters: CharacterFilters, page: number): string {
  const url = new URL("https://api.disneyapi.dev/character");
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", "50");
  for (const [key, value] of Object.entries(filters)) {
    // The API uses regex filters, so titles and names must be escaped before URL encoding.
    if (value?.trim()) url.searchParams.set(key, value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  }
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && !!item.trim()))]
    : [];
}

function webUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeCharacters(data: unknown): Character[] {
  const records = Array.isArray(data) ? data : isRecord(data) ? [data] : [];
  const characters = new Map<number, Character>();
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record._id !== "number" ||
      !Number.isInteger(record._id) ||
      typeof record.name !== "string" ||
      !record.name.trim()
    )
      continue;

    characters.set(record._id, {
      _id: record._id,
      name: record.name,
      sourceUrl: webUrl(record.sourceUrl),
      imageUrl: webUrl(record.imageUrl),
      films: stringList(record.films),
      shortFilms: stringList(record.shortFilms),
      tvShows: stringList(record.tvShows),
      videoGames: stringList(record.videoGames),
      parkAttractions: stringList(record.parkAttractions),
      allies: stringList(record.allies),
      enemies: stringList(record.enemies),
    });
  }
  return [...characters.values()];
}

export function parseCharacterPage(payload: unknown, page: number): CharacterPage {
  if (!isRecord(payload) || !("data" in payload)) throw new Error("Disney API returned an unexpected response");
  if (payload.data !== null && !Array.isArray(payload.data) && !isRecord(payload.data)) {
    throw new Error("Disney API returned invalid character data");
  }
  const data = normalizeCharacters(payload.data);
  const info = isRecord(payload.info) ? payload.info : {};
  // Rebuild each page URL with the filters: the API's nextPage URL drops them.
  const hasMore =
    data.length > 0 && (typeof info.totalPages === "number" ? page < info.totalPages : !!webUrl(info.nextPage));
  return { data, hasMore };
}

export async function parseCharacterResponse(response: Response): Promise<CharacterPage> {
  if (!response.ok) throw new Error(`Disney API request failed (${response.status})`);
  const page = Number(new URL(response.url).searchParams.get("page") || "1");
  return parseCharacterPage(await response.json(), page);
}

export function characterWikiUrl(character: Character): string {
  if (character.sourceUrl) return character.sourceUrl;
  const url = new URL("https://disney.fandom.com/wiki/Special:Search");
  url.searchParams.set("query", character.name);
  return url.toString();
}

export function toggleFavourite(favourites: Character[], character: Character): Character[] {
  return favourites.some((item) => item._id === character._id)
    ? favourites.filter((item) => item._id !== character._id)
    : [...favourites, character];
}

// Film and show lists each own a hook, but they write one favourite array.
// Updates run one at a time and each one starts from the latest array, so a
// slow save cannot replace a toggle that happened while it was writing.
export function createFavouriteSaver(initial?: Character[]) {
  let latest: Character[] | undefined = initial;
  let queue: Promise<void> = Promise.resolve();

  return {
    current(): Character[] | undefined {
      return latest;
    },
    initialize(loaded: Character[]): boolean {
      if (latest !== undefined) return false;
      latest = loaded;
      return true;
    },
    update(character: Character, persist: (favourites: Character[]) => Promise<void>): Promise<void> {
      const run = queue.then(async () => {
        const current = latest ?? [];
        const next = toggleFavourite(current, character);
        latest = next;
        try {
          await persist(next);
        } catch (error) {
          latest = current;
          throw error;
        }
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}
