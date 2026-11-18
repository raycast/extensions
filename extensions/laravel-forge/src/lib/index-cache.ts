import { LocalStorage } from "@raycast/api";

// One blob, not a key per record: a fleet of thousands stays one read
const KEY = "forge:index";

export type Coordinates = { tokenKey: string; org: string; serverId?: number };

type Index = {
  orgs: Record<string, string[]>;
  sites: Record<string, Coordinates>;
  servers: Record<string, Coordinates>;
};

const empty = (): Index => ({ orgs: {}, sites: {}, servers: {} });

// A malformed blob is not worth recovering; the next list call rebuilds it
const read = async (): Promise<Index> => {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
};

const write = (index: Index) => LocalStorage.setItem(KEY, JSON.stringify(index));

// Concurrent writers each save their own stale copy of the blob, so writes take turns
let queue: Promise<unknown> = Promise.resolve();

const mutate = (change: (index: Index) => void): Promise<void> => {
  const next = queue.then(async () => {
    const index = await read();
    change(index);
    await write(index);
  });
  // A rejected turn must not poison every turn behind it
  queue = next.catch(() => undefined);
  return next;
};

// Every entry here is immutable, so nothing expires: a wrong one 404s and is dropped
export const rememberOrgs = (tokenKey: string, orgs: string[]) =>
  mutate((index) => {
    index.orgs[tokenKey] = orgs;
  });

export const knownOrgs = async (tokenKey: string) => (await read()).orgs[tokenKey];

export const forgetOrgs = (tokenKey: string) =>
  mutate((index) => {
    delete index.orgs[tokenKey];
  });

type Kind = "site" | "server";

export const remember = (kind: Kind, id: number | string, where: Coordinates) => rememberMany(kind, [[id, where]]);

// One write for a page of rows; one per row would rewrite the blob N times
export const rememberMany = async (kind: Kind, entries: Array<[number | string, Coordinates]>) => {
  const usable = entries.filter(([, where]) => where.tokenKey && where.org);
  if (!usable.length) return;
  await mutate((index) => {
    for (const [id, where] of usable) index[`${kind}s`][String(id)] = where;
  });
};

// get-site reads the site then its server, so a listed row has to cache both
export const rememberSites = async (entries: Array<[number | string, Coordinates]>) => {
  await rememberMany("site", entries);
  await rememberMany(
    "server",
    entries
      .filter(([, where]) => where.serverId)
      .map(([, where]) => [where.serverId as number, { tokenKey: where.tokenKey, org: where.org }]),
  );
};

export const lookup = async (kind: Kind, id: number | string): Promise<Coordinates | undefined> =>
  (await read())[`${kind}s`][String(id)];

export const forget = (kind: Kind, id: number | string) =>
  mutate((index) => {
    delete index[`${kind}s`][String(id)];
  });
