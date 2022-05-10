import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { LocalStorage } from "@raycast/api";
import { Page, User, Database, DatabaseView, DatabaseProperty } from "./types";

const primitiveRecentlyOpenedPages = atom<Page[]>([]);
primitiveRecentlyOpenedPages.onMount = (setAtom) => {
  LocalStorage.getItem("RECENTLY_OPENED_PAGES").then((data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) || [] : [];
    setAtom(Array.isArray(parsed) ? parsed : []);
  });
};

export const recentlyOpenedPagesAtom = atom(
  (get) => get(primitiveRecentlyOpenedPages),
  async (get, set, page: Page) => {
    let recentlyOpenPages = get(primitiveRecentlyOpenedPages);

    const cachedPageIndex = recentlyOpenPages.findIndex((x) => x.id === page.id);

    page.last_edited_time = Date.now();

    if (cachedPageIndex > -1) {
      recentlyOpenPages[cachedPageIndex] = page;
    } else {
      recentlyOpenPages.push(page);
    }

    recentlyOpenPages.sort((a: Page, b: Page) => {
      if ((a.last_edited_time || 0) > (b.last_edited_time || 0)) {
        return -1;
      }
      if ((a.last_edited_time || 0) < (b.last_edited_time || 0)) {
        return 1;
      }
      return 0;
    });

    recentlyOpenPages = recentlyOpenPages.slice(0, 20);

    set(primitiveRecentlyOpenedPages, recentlyOpenPages);

    await LocalStorage.setItem("RECENTLY_OPENED_PAGES", JSON.stringify(recentlyOpenPages));
  }
);

const primitiveUsers = atom<User[]>([]);
primitiveUsers.onMount = (setAtom) => {
  LocalStorage.getItem("USERS").then((data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) || [] : [];
    setAtom(Array.isArray(parsed) ? parsed : []);
  });
};

export const usersAtom = atom(
  (get) => get(primitiveUsers),
  async (get, set, users: User[]) => {
    set(primitiveUsers, users);
    await LocalStorage.setItem("USERS", JSON.stringify(users));
  }
);

const primitiveDatabases = atom<Database[]>([]);
primitiveDatabases.onMount = (setAtom) => {
  LocalStorage.getItem("DATABASES").then((data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) || [] : [];
    setAtom(Array.isArray(parsed) ? parsed : []);
  });
};

export const databasesAtom = atom(
  (get) => get(primitiveDatabases),
  async (get, set, databases: Database[]) => {
    set(primitiveDatabases, databases);
    await LocalStorage.setItem("DATABASES", JSON.stringify(databases));
  }
);

const primitiveDatabaseViews = atom<{ [databaseId: string]: DatabaseView | undefined }>({});
primitiveDatabaseViews.onMount = (setAtom) => {
  LocalStorage.getItem("DATABASES_VIEWS").then((data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) || [] : [];
    setAtom(typeof parsed === "object" ? parsed : {});
  });
};

export const databaseViewsAtom = atomFamily((databaseId: string) =>
  atom(
    (get) => get(primitiveDatabaseViews)[databaseId],
    async (get, set, databaseView: DatabaseView | undefined) => {
      const newData = { ...get(primitiveDatabaseViews), [databaseId]: databaseView };
      set(primitiveDatabaseViews, newData);
      await LocalStorage.setItem("DATABASES_VIEWS", JSON.stringify(newData));
    }
  )
);

const primitiveDatabaseProperties = atom<{ [databaseId: string]: DatabaseProperty[] | undefined }>({});
primitiveDatabaseProperties.onMount = (setAtom) => {
  LocalStorage.getItem("DATABASE_PROPERTIES").then((data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) || [] : [];
    setAtom(typeof parsed === "object" ? parsed : {});
  });
};

export const databasePropertiesAtom = atomFamily((databaseId: string) =>
  atom(
    (get) => get(primitiveDatabaseProperties)[databaseId] || [],
    async (get, set, databaseProperties: DatabaseProperty[]) => {
      const newData = {
        ...get(primitiveDatabaseProperties),
        [databaseId]: databaseProperties,
      };
      set(primitiveDatabaseProperties, newData);
      await LocalStorage.setItem("DATABASE_PROPERTIES", JSON.stringify(newData));
    }
  )
);
