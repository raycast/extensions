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

export function getSearchPins(pins: SearchPinsFile): SearchBookmark[] {
  const bookmarks: SearchBookmark[] = [];
  const seen = new Set<string>();

  for (const list of Object.values(pins)) {
    if (!Array.isArray(list)) {
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
