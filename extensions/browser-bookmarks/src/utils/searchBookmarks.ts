import { readdir, readFile } from "fs/promises";

// Search keeps its bookmarks as plain JSON: a list of nodes, each with an id
// and a title, holding either an address or children. A node with children is
// a folder; a node with an address is a bookmark.
export type SearchBookmarkNode = {
  id: string;
  title: string;
  url?: string;
  children?: SearchBookmarkNode[];
};

export type SearchBookmark = {
  id: string;
  title: string;
  url: string;
  folder: string;
};

export type SearchFolder = {
  id: string;
  title: string;
};

function join(hierarchy: string, title: string) {
  return hierarchy === "" ? title : `${hierarchy}/${title}`;
}

export function getSearchBookmarks(nodes: SearchBookmarkNode[], hierarchy = ""): SearchBookmark[] {
  const bookmarks: SearchBookmark[] = [];

  for (const node of nodes) {
    if (node.children) {
      bookmarks.push(...getSearchBookmarks(node.children, join(hierarchy, node.title)));
      continue;
    }

    if (!node.url) {
      continue;
    }

    bookmarks.push({
      id: node.id,
      // A bookmark whose title was emptied reads as its address, which is how
      // Search itself shows it once it is only an icon on the bar.
      title: node.title.trim() === "" ? node.url : node.title,
      url: node.url,
      folder: hierarchy,
    });
  }

  return bookmarks;
}

export function getSearchFolders(nodes: SearchBookmarkNode[], hierarchy = ""): SearchFolder[] {
  const folders: SearchFolder[] = [];

  for (const node of nodes) {
    if (!node.children) {
      continue;
    }

    const title = join(hierarchy, node.title);
    folders.push({ id: node.id, title });
    folders.push(...getSearchFolders(node.children, title));
  }

  return folders;
}

// Beside its bookmarks, Search keeps pinned tabs: the row of icons at the top
// of the sidebar, the same in every window. They are saved links of their own,
// so they come in under one folder, as Arc's pinned items do.
export const SEARCH_PINS_FOLDER = {
  id: "search-pins",
  title: "Pinned",
};

export type SearchPin = {
  id: string;
  home: string;
  title: string;
  name?: string;
};

// Pins are kept per space, plus a "shared" list shown above every space.
export type SearchPinsFile = Record<string, SearchPin[]>;

export function getSearchPins(pins: SearchPinsFile, keys?: string[]): SearchBookmark[] {
  const bookmarks: SearchBookmark[] = [];
  const seen = new Set<string>();
  // With several profiles, only the keys of the chosen one are read. With a
  // single profile there is nothing to choose and every key is read.
  const wanted = keys && new Set(keys.map((key) => key.toLowerCase()));

  for (const [key, list] of Object.entries(pins)) {
    if (!Array.isArray(list) || (wanted && !wanted.has(key.toLowerCase()))) {
      continue;
    }

    for (const pin of list) {
      // A pin shown above every space is in the shared list and in no other,
      // but a file written by an older version may hold it twice.
      if (!pin?.home || seen.has(pin.id)) {
        continue;
      }
      seen.add(pin.id);

      const title = pin.name?.trim() || pin.title?.trim() || pin.home;
      bookmarks.push({ id: pin.id, title, url: pin.home, folder: SEARCH_PINS_FOLDER.title });
    }
  }

  return bookmarks;
}

// The named lists in Search's sidebar are tab groups, kept in the session file
// of each space: session.json for the first, session-<space>.json for the
// others. Their tabs come back at every launch, so they are the closest thing
// to Arc's folders of pinned tabs, and they come in under the group's name.
// A tab in no group is the day's browsing, and is left out.
export type SearchSessionTab = {
  title?: string;
  url?: string;
  groupID?: string;
};

export type SearchSessionGroup = {
  id: string;
  name: string;
};

export type SearchSession = {
  tabs?: SearchSessionTab[];
  groups?: SearchSessionGroup[];
};

export function getSearchGroupFolders(sessions: SearchSession[]): SearchFolder[] {
  const folders: SearchFolder[] = [];
  const seen = new Set<string>();

  for (const session of sessions) {
    for (const group of session.groups ?? []) {
      if (!group?.id || seen.has(group.id)) {
        continue;
      }
      seen.add(group.id);
      folders.push({ id: group.id, title: group.name });
    }
  }

  return folders;
}

export function getSearchGroupTabs(sessions: SearchSession[]): SearchBookmark[] {
  const bookmarks: SearchBookmark[] = [];
  const seen = new Set<string>();

  for (const session of sessions) {
    const names = new Map((session.groups ?? []).map((group) => [group.id, group.name]));

    for (const tab of session.tabs ?? []) {
      const name = tab.groupID ? names.get(tab.groupID) : undefined;

      // A session file written while a group was being removed can name a
      // group that is no longer there.
      if (!name || !tab.url) {
        continue;
      }

      // A session tab carries no id of its own, so its group and address name
      // it, which holds across launches.
      const id = `${tab.groupID}:${tab.url}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      bookmarks.push({ id, title: tab.title?.trim() || tab.url, url: tab.url, folder: name });
    }
  }

  return bookmarks;
}

// Profiles, from 1.0.7 on: whole separate browsers in one app. Personal keeps
// the files that were there before, every other profile has its own bookmarks
// file and its own key in pins.json. `profiles.json` is written only once a
// second profile exists, so no file means there is nothing to choose.
export const SEARCH_PERSONAL_PROFILE = "00000000-0000-0000-0000-0000000000A1";
export const SEARCH_FIRST_SPACE = "00000000-0000-0000-0000-000000000001";

export type SearchProfile = {
  id: string;
  name: string;
};

export type SearchSpace = {
  id: string;
  /// Absent for a space of Personal, which is every space from before profiles.
  profile?: string;
};

const same = (one: string, other: string) => one.toLowerCase() === other.toLowerCase();

export function getSearchProfiles(saved?: SearchProfile[]): { path: string; name: string }[] {
  if (!saved?.length) {
    return [];
  }

  const personal = saved.find((profile) => same(profile.id, SEARCH_PERSONAL_PROFILE));

  return [
    { path: SEARCH_PERSONAL_PROFILE, name: personal?.name || "Personal" },
    ...saved
      .filter((profile) => !same(profile.id, SEARCH_PERSONAL_PROFILE))
      .map((profile) => ({ path: profile.id, name: profile.name })),
  ];
}

/// The profile to read, given what is saved and what is there. A profile
/// deleted in Search leaves its id behind in the cache, and reading a file
/// that is gone would leave the person with an empty list and no submenu to
/// get out of it, so the choice falls back to Personal.
export function profileToRead(saved: { path: string }[], chosen: string): string {
  if (!chosen || !saved.some((profile) => same(profile.path, chosen))) {
    return SEARCH_PERSONAL_PROFILE;
  }

  return chosen;
}

export function bookmarksFileFor(profile: string): string {
  return same(profile, SEARCH_PERSONAL_PROFILE) ? "bookmarks.json" : `bookmarks-${profile}.json`;
}

/// The spaces a profile holds. A space with no profile of its own is Personal's.
export function spacesOfProfile(spaces: SearchSpace[], profile: string): string[] {
  const personal = same(profile, SEARCH_PERSONAL_PROFILE);

  return spaces.filter((space) => (space.profile ? same(space.profile, profile) : personal)).map((space) => space.id);
}

/// Where a profile's pins are: the list every one of its spaces shows, then
/// each space's own.
export function pinKeysFor(profile: string, spaces: string[]): string[] {
  const shared = same(profile, SEARCH_PERSONAL_PROFILE) ? "shared" : `shared:${profile}`;

  return [shared, ...spaces];
}

/// The session file of a space: the first space kept the name it had before
/// there were spaces.
export function sessionFileFor(space: string): string {
  return same(space, SEARCH_FIRST_SPACE) ? "session.json" : `session-${space}.json`;
}

// Any of Search's files is missing until there is something to put in it, and
// one without the others is an ordinary state rather than an error.
async function readJson<T>(root: string, name: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(`${root}/${name}`, "utf-8")) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT" || error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
}

// One session file per space. With a single profile there is nothing to
// choose, so every file in the folder is read; with several, only the files
// of the chosen profile's spaces are.
async function readSessions(root: string, spaces?: string[]): Promise<SearchSession[]> {
  let names: string[];

  if (spaces) {
    names = spaces.map(sessionFileFor);
  } else {
    try {
      names = (await readdir(root)).filter((name) => name === "session.json" || /^session-.+\.json$/.test(name));
    } catch {
      return [];
    }
  }

  const sessions = await Promise.all(names.map((name) => readJson<SearchSession>(root, name)));

  return sessions.filter((session): session is SearchSession => session !== undefined);
}

export async function readSearchProfiles(root: string) {
  return getSearchProfiles(await readJson<SearchProfile[]>(root, "profiles.json"));
}

export type SearchData = {
  bookmarks: SearchBookmarkNode[];
  pins: SearchPinsFile;
  sessions: SearchSession[];
  /// The pins keys to read, or undefined when there is nothing to choose
  /// between and every key is read.
  keys?: string[];
};

/// Everything one profile holds. Before 1.0.7 there were no profiles, so
/// `profiles.json` is missing and the whole folder is that one profile's.
export async function readSearchData(root: string, profile: string): Promise<SearchData> {
  const chosen = profile || SEARCH_PERSONAL_PROFILE;
  const several = ((await readJson<SearchProfile[]>(root, "profiles.json")) ?? []).length > 1;
  const spaces = several
    ? spacesOfProfile((await readJson<SearchSpace[]>(root, "spaces.json")) ?? [], chosen)
    : undefined;

  const [bookmarks, pins, sessions] = await Promise.all([
    readJson<SearchBookmarkNode[]>(root, bookmarksFileFor(chosen)),
    readJson<SearchPinsFile>(root, "pins.json"),
    readSessions(root, spaces),
  ]);

  return {
    bookmarks: bookmarks ?? [],
    pins: pins ?? {},
    sessions,
    keys: spaces && pinKeysFor(chosen, spaces),
  };
}
