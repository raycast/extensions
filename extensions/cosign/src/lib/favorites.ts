import { LocalStorage } from "@raycast/api";
import { callTool } from "./cosign-mcp";
import { organizationImage } from "./inbox";

export type FavoriteKind = "people" | "organizations";

export interface Favorite {
  kind: FavoriteKind;
  id: string;
  /** Id that edit_list_entries removes by (the list entry's nominee). */
  entryId: string;
  name: string;
  imageUrl: string | null;
  subtitle: string | null;
}

export interface Favorites {
  people: Favorite[];
  organizations: Favorite[];
}

interface ListSummary {
  listId: string;
  kind: string;
  titleBody: string;
}

interface ListEntry {
  card?: { kind?: string; organizationId?: string; tagline?: string | null } | null;
  nominee: { nomineeId: string; displayName: string; imageUrl: string | null; displayHandle?: string | null };
}

interface ListDetail {
  members: ListEntry[];
}

const LISTS_KEY = "cosign.favorites-lists";
const TITLES: Record<FavoriteKind, string> = {
  people: "Raycast Favorites: People",
  organizations: "Raycast Favorites: Companies",
};
const DESCRIPTIONS: Record<FavoriteKind, string> = {
  people: "People starred from the Raycast extension.",
  organizations: "Companies starred from the Raycast extension.",
};

type ListIds = Partial<Record<FavoriteKind, string>>;

async function readIds(): Promise<ListIds> {
  const raw = await LocalStorage.getItem<string>(LISTS_KEY);
  return raw ? (JSON.parse(raw) as ListIds) : {};
}

const writeIds = (ids: ListIds) => LocalStorage.setItem(LISTS_KEY, JSON.stringify(ids));

/** Signing out drops the cached list ids, since the next account has its own lists. */
export const forgetListIds = () => LocalStorage.removeItem(LISTS_KEY);

const creating: Partial<Record<FavoriteKind, Promise<string | undefined>>> = {};

function listId(kind: FavoriteKind, create: boolean): Promise<string | undefined> {
  if (!create) return findList(kind, false);
  // Two first-use stars in a row must share one creation, not make two lists.
  return (creating[kind] ??= findList(kind, true).finally(() => delete creating[kind]));
}

async function findList(kind: FavoriteKind, create: boolean): Promise<string | undefined> {
  const ids = await readIds();
  if (ids[kind]) return ids[kind];

  const lists = await callTool<ListSummary[]>("find_lists", { request: { action: "mine", args: {} } });
  let found = lists.find((l) => l.kind === kind && l.titleBody === TITLES[kind])?.listId;
  if (!found && create) {
    const made = await callTool<{ listId: string }>("create_list", {
      title: TITLES[kind],
      kind,
      visibility: "private",
      description: DESCRIPTIONS[kind],
    });
    found = made.listId;
  }
  if (found) await writeIds({ ...ids, [kind]: found });
  return found;
}

async function forgetId(kind: FavoriteKind) {
  const ids = await readIds();
  delete ids[kind];
  await writeIds(ids);
}

/**
 * A failed read or write keeps the cached id unless its list is really gone (deleted on the web). A rate limit, a timeout or going offline says
 * nothing about the list, and forgetting the id then costs a `find_lists` call on the next load.
 */
async function forgetIdIfGone(kind: FavoriteKind) {
  const id = (await readIds())[kind];
  if (!id) return;
  const list = await callTool<ListDetail | null>("read_list", {
    request: { action: "entries", args: { listId: id } },
  }).catch(() => undefined);
  if (list === null) await forgetId(kind);
}

async function readList(kind: FavoriteKind, retried = false): Promise<Favorite[]> {
  const id = await listId(kind, false);
  if (!id) return [];
  const list = await callTool<ListDetail | null>("read_list", {
    request: { action: "entries", args: { listId: id } },
  });
  if (!list) {
    // The cached list is gone (deleted on the web). Look it up again once; if it's still missing, it's empty.
    await forgetId(kind);
    return retried ? [] : readList(kind, true);
  }
  return list.members.flatMap((m): Favorite[] => {
    const orgId = m.card?.kind === "organization" ? m.card.organizationId : undefined;
    const entityId = kind === "organizations" ? orgId : m.nominee.nomineeId;
    if (!entityId) return [];
    return [
      {
        kind,
        id: entityId,
        entryId: m.nominee.nomineeId,
        name: m.nominee.displayName,
        imageUrl: kind === "organizations" ? organizationImage(entityId) : m.nominee.imageUrl,
        subtitle: kind === "organizations" ? (m.card?.tagline ?? null) : (m.nominee.displayHandle ?? null),
      },
    ];
  });
}

// Every Favorite action on screen calls this hook's fetcher; share one in-flight read per command process.
let inflight: { at: number; promise: Promise<Favorites> } | undefined;

export function fetchFavorites(): Promise<Favorites> {
  if (inflight && Date.now() - inflight.at < 5000) return inflight.promise;
  const promise = readFavorites();
  inflight = { at: Date.now(), promise };
  promise.catch(() => (inflight = undefined));
  return promise;
}

async function readFavorites(): Promise<Favorites> {
  try {
    const [people, organizations] = await Promise.all([readList("people"), readList("organizations")]);
    return { people, organizations };
  } catch (error) {
    await Promise.all([forgetIdIfGone("people"), forgetIdIfGone("organizations")]);
    throw error;
  }
}

/** Drop any read that began before the write, so it can't show the old state. */
async function write(kind: FavoriteKind, work: () => Promise<void>): Promise<void> {
  inflight = undefined;
  try {
    await work();
  } catch (error) {
    await forgetIdIfGone(kind);
    throw error;
  } finally {
    inflight = undefined;
  }
}

export const addFavorite = (kind: FavoriteKind, id: string) =>
  write(kind, async () => {
    const list = await listId(kind, true);
    if (!list) throw new Error("Couldn't find or create the favorites list.");
    await callTool("edit_list_entries", {
      request: {
        action: "add",
        args: { listId: list, target: kind === "people" ? { kind, nomineeId: id } : { kind, organizationId: id } },
      },
    });
  });

export const removeFavorite = (favorite: Favorite) =>
  write(favorite.kind, async () => {
    const list = await listId(favorite.kind, false);
    if (!list) return;
    await callTool("edit_list_entries", {
      request: {
        action: "edit",
        args: { listId: list, item: { kind: "member", nomineeId: favorite.entryId }, change: { operation: "remove" } },
      },
    });
  });
