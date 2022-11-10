import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { Page, User, Database, DatabaseView, DatabaseProperty } from "./types";
import { atomWithLocalStorage } from "./atomWithLocalStorage";

const primitiveRecentlyOpenedPages = atomWithLocalStorage<Page[]>("RECENTLY_OPENED_PAGES", []);

export const recentlyOpenedPagesAtom = atom(
  (get) => get(primitiveRecentlyOpenedPages),
  (get, set, page: Page) => {
    let { value: recentlyOpenPages } = get(primitiveRecentlyOpenedPages);

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

    return set(primitiveRecentlyOpenedPages, recentlyOpenPages);
  }
);

export const usersAtom = atomWithLocalStorage<User[]>("USERS", []);

export const databasesAtom = atomWithLocalStorage<Database[]>("DATABASES", []);

const primitiveDatabaseViews = atomWithLocalStorage<{ [databaseId: string]: DatabaseView | undefined }>(
  "DATABASES_VIEWS",
  {}
);
export const databaseViewsAtom = atomFamily((databaseId: string) =>
  atom(
    (get) => {
      const { loading, value } = get(primitiveDatabaseViews);
      return { loading, value: value[databaseId] };
    },
    (get, set, databaseView: DatabaseView | undefined) => {
      const newData = { ...get(primitiveDatabaseViews).value, [databaseId]: databaseView };
      return set(primitiveDatabaseViews, newData);
    }
  )
);

const primitiveDatabaseProperties = atomWithLocalStorage<{ [databaseId: string]: DatabaseProperty[] | undefined }>(
  "DATABASE_PROPERTIES",
  {}
);

export const databasePropertiesAtom = atomFamily((databaseId: string) =>
  atom(
    (get) => {
      const { loading, value } = get(primitiveDatabaseProperties);
      return { loading, value: value[databaseId] || [] };
    },
    (get, set, databaseProperties: DatabaseProperty[]) => {
      const newData = {
        ...get(primitiveDatabaseProperties).value,
        [databaseId]: databaseProperties,
      };
      return set(primitiveDatabaseProperties, newData);
    }
  )
);
