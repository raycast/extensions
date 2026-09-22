import { TraktListEntry } from "../lib/schema";
import { CompactList, CompactListEntry, toCompactList, toCompactListEntry } from "./compact-media";
import { fetchAllLists, fetchListItems, getOwnList } from "./list-api";
import { listNameContains, listNameEquals } from "./list-matching";
import { isMatchableTitle, partitionByLookup, resolveLookupQuery } from "./title-text";

type ItemType = "movies" | "shows" | "seasons" | "episodes";

type Input = {
  /**
   * Name or partial name of a list to look up (e.g. "Oscars"). Omit to get every personal list.
   */
  query?: string;
  /**
   * Trakt ID or slug of one list. Takes precedence over `query`.
   */
  listId?: string;
  /**
   * Set to true to also return the items of the matched list. Only applies when exactly one
   * list matches.
   */
  includeItems?: boolean;
  /**
   * Maximum number of items to return when `includeItems` is true (default: 50, max: 100).
   */
  itemLimit?: number;
  /**
   * Check whether a title is on the matched list (e.g. "Parasite"). ALWAYS use this instead of
   * reading `items` yourself: it scans every item, not just the ones returned.
   * A year in the text ("Dune 1989") is read as a year filter.
   */
  itemQuery?: string;
  /**
   * Optional release year for `itemQuery`. For seasons and episodes, this is the show's year.
   */
  itemYear?: number;
  /**
   * Trakt ID of the item to check. Movie, show, season and episode IDs overlap, so `itemType`
   * is required with it.
   */
  itemTraktId?: number;
  /**
   * Which item type `itemQuery` / `itemTraktId` targets: "movies", "shows", "seasons" or
   * "episodes". Defaults to movies and shows. Seasons and episodes are matched by show title.
   */
  itemType?: ItemType;
};

type Output = {
  /**
   * True only for a list whose name matches `query` outright, or for the requested `listId`.
   * Lists whose name merely contains the query stay in `lists` without making this true.
   */
  found: boolean;
  /**
   * For an item check: true only when the exact title (or the requested ID) is on the list.
   */
  inList?: boolean;
  /**
   * True when every list (and, for item checks, every item of the list) was inspected, so a
   * negative answer is definitive. Absence proves nothing while this is false.
   */
  exhaustive: boolean;
  message: string;
  lists: CompactList[];
  /** Items of the matched list, when requested. */
  items?: CompactListEntry[];
  /** For an item check: entries matching the title, the ID, or containing the title. */
  matchedItems?: CompactListEntry[];
  totalItems?: number;
};

const ENTRY_TYPE: Record<ItemType, string> = {
  movies: "movie",
  shows: "show",
  seasons: "season",
  episodes: "episode",
};

function entryTitles(entry: TraktListEntry): Array<string | undefined> {
  if (entry.type === "movie") return [entry.movie?.title];
  if (entry.type === "show") return [entry.show?.title];
  if (entry.type === "episode") return [entry.show?.title, entry.episode?.title ?? undefined];
  return [entry.show?.title];
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

async function checkMembership(
  list: CompactList,
  input: Input,
): Promise<Pick<Output, "inList" | "exhaustive" | "message" | "matchedItems" | "totalItems">> {
  const { itemQuery, itemYear, itemTraktId, itemType } = input;

  if (itemTraktId !== undefined && !itemType) {
    return {
      inList: false,
      exhaustive: false,
      message:
        `Trakt ID ${itemTraktId} is ambiguous: movie, show, season and episode IDs overlap. ` +
        `Call again with \`itemType\` instead of answering from this ID.`,
    };
  }

  const lookup = resolveLookupQuery(itemQuery, itemYear);
  if (itemQuery && itemTraktId === undefined && !isMatchableTitle(lookup.text ?? itemQuery)) {
    return {
      inList: false,
      exhaustive: false,
      message:
        `The title ${JSON.stringify(itemQuery)} cannot be compared: after normalization it has no letters or ` +
        `digits. This is NOT a confirmed absence from "${list.name}".`,
    };
  }

  const fetched = await fetchListItems(list.listId, list.name);
  const wantedTypes = itemType ? [ENTRY_TYPE[itemType]] : ["movie", "show"];
  const candidates = fetched.items.filter((entry) => wantedTypes.includes(entry.type));
  const compact = new Map(candidates.map((entry) => [entry, toCompactListEntry(entry)]));

  const pick = partitionByLookup(
    candidates,
    entryTitles,
    (entry) => compact.get(entry)?.traktId ?? 0,
    (entry) => compact.get(entry)?.year,
    itemQuery,
    itemTraktId,
    itemYear,
  );

  const toCompact = (entries: TraktListEntry[]) => entries.map((entry) => compact.get(entry) as CompactListEntry);
  const exact = toCompact(pick.exact);
  const yearHeldBy = toCompact(pick.yearHeldBy);
  const yearUnknown = toCompact(pick.yearUnknown);
  const related = toCompact(pick.related);
  const target = itemQuery ? `"${itemQuery}"` : `Trakt ID ${itemTraktId}`;
  const yearLabel = lookup.year !== undefined && itemQuery ? ` (${lookup.year})` : "";
  const inList = exact.length > 0;
  const exhaustive = fetched.exhaustive && (inList || (yearHeldBy.length === 0 && yearUnknown.length === 0));
  const describe = (entries: CompactListEntry[]) =>
    entries.map((entry) => `"${entry.title}"${entry.year ? ` (${entry.year})` : ""}`).join(", ");

  let message: string;
  if (inList) {
    message =
      related.length > 0
        ? `${target}${yearLabel} is on "${list.name}", plus ${related.length} related ` +
          `${plural(related.length, "entry", "entries")} whose title contains it.`
        : `${target}${yearLabel} is on "${list.name}".`;
  } else if (yearHeldBy.length > 0) {
    message =
      `${target} is on "${list.name}", but not for ${lookup.year}: ${describe(yearHeldBy)}. ` +
      `Ask which release they mean instead of reporting a confirmed absence.`;
  } else if (yearUnknown.length > 0) {
    message =
      `${target} is on "${list.name}", but Trakt gave no year for ${describe(yearUnknown)}, so this is NOT proof ` +
      `it is the ${lookup.year} release and NOT a confirmed absence.`;
  } else if (related.length > 0) {
    message =
      `${target} itself is not on "${list.name}", but ${related.length} related ` +
      `${plural(related.length, "entry shares", "entries share")} part of that title: ${describe(related)}. ` +
      `Ask whether they meant one of those rather than answering with a flat no.`;
  } else if (exhaustive) {
    message = `Confirmed: ${target}${yearLabel} is not on "${list.name}" (checked all ${fetched.totalItems} item(s)).`;
  } else {
    message =
      `${target}${yearLabel} was not found, but "${list.name}" is too large to scan entirely. ` +
      `This result is NOT definitive.`;
  }

  const matchedItems = [...exact, ...yearHeldBy, ...yearUnknown, ...related];
  return {
    inList,
    exhaustive,
    message,
    matchedItems: matchedItems.length > 0 ? matchedItems : undefined,
    totalItems: fetched.totalItems,
  };
}

/**
 * Get the personal lists on your Trakt account, read the items of one list, or check whether
 * a title is on a list. Use this before `add-to-list`, `remove-from-list`, `update-list` or
 * `delete-list` to find the `listId` of an existing list.
 */
export default async function tool(input: Input): Promise<Output> {
  const { query, listId, includeItems = false, itemLimit = 50, itemQuery, itemTraktId } = input;
  const safeItemLimit = Math.min(Math.max(itemLimit, 1), 100);
  const wantsMembership = Boolean(itemQuery) || itemTraktId !== undefined;

  let exact: CompactList[] = [];
  let partial: CompactList[] = [];
  let listsExhaustive = true;
  let allLists: CompactList[] = [];

  if (listId) {
    exact = [toCompactList(await getOwnList(listId))];
  } else {
    const fetched = await fetchAllLists();
    listsExhaustive = fetched.exhaustive;
    allLists = fetched.lists.map(toCompactList);

    if (query) {
      exact = allLists.filter((list) => listNameEquals(list.name, query));
      partial = allLists.filter((list) => !exact.includes(list) && listNameContains(list.name, query));
    } else {
      exact = allLists;
    }
  }

  const lists = [...exact, ...partial];
  const found = exact.length > 0;
  const target = listId ? `list ${listId}` : query ? `"${query}"` : "any list";

  if (lists.length === 0) {
    const names = allLists.map((list) => `"${list.name}"`).join(", ") || "none";
    return {
      found: false,
      exhaustive: listsExhaustive,
      message: listsExhaustive
        ? `No personal list matching ${target}. You have ${allLists.length} list(s): ${names}.`
        : `No personal list matching ${target} among the ${allLists.length} list(s) Trakt returned, but not every ` +
          `list could be read. This is NOT a confirmed absence.`,
      lists: allLists,
    };
  }

  let message: string;
  if (!query || listId) {
    message = `Found ${lists.length} list(s).`;
  } else if (found) {
    message =
      partial.length > 0
        ? `Found ${exact.length} list(s) named ${target}, plus ${partial.length} whose name contains it.`
        : `Found ${exact.length} list(s) named ${target}.`;
  } else {
    message =
      `No list named exactly ${target}, but ${partial.length} list(s) contain that name: ` +
      `${partial.map((list) => `"${list.name}"`).join(", ")}. Ask the user which one they mean ` +
      `instead of treating a partial match as the list.`;
  }
  if (!listsExhaustive) message += " Not every list could be read.";

  if ((includeItems || wantsMembership) && lists.length !== 1) {
    return {
      found,
      exhaustive: false,
      message: `${message} Cannot read items: ${lists.length} lists matched — pass \`listId\` to pick one.`,
      lists,
    };
  }

  if (wantsMembership) {
    const membership = await checkMembership(lists[0], input);
    return {
      found,
      lists,
      ...membership,
      message: found ? membership.message : `${message} ${membership.message}`,
    };
  }

  if (includeItems) {
    const matched = lists[0];
    const fetched = await fetchListItems(matched.listId, matched.name);
    const shown = fetched.items.slice(0, safeItemLimit).map(toCompactListEntry);
    const complete = fetched.exhaustive && shown.length === fetched.items.length;
    const itemMessage = complete
      ? `"${matched.name}" contains ${fetched.totalItems} item(s).`
      : `Showing ${shown.length} of ${fetched.totalItems} item(s) in "${matched.name}". To check whether a ` +
        `title is on the list, call again with \`itemQuery\` instead of reading this page.`;

    return {
      found,
      exhaustive: complete,
      message: found ? itemMessage : `${message} ${itemMessage}`,
      lists,
      items: shown,
      totalItems: fetched.totalItems,
    };
  }

  return {
    found,
    exhaustive: listsExhaustive,
    message,
    lists,
  };
}
