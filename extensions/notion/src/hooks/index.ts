import { LocalStorage, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  fetchDatabaseProperties,
  fetchUsers,
  fetchDatabases,
  queryDatabase,
  search,
  fetchPage,
  fetchDatabase,
  isType,
  type Page,
  type DatabaseProperty,
} from "../utils/notion";
import { DatabaseView } from "../utils/types";

export function useUsers() {
  const value = useCachedPromise(() => fetchUsers());

  return { ...value, data: value.data ?? [] };
}

export function useRelations(properties: DatabaseProperty[]) {
  return useCachedPromise(
    async (properties: DatabaseProperty[]) => {
      const relationPages: Record<string, Page[]> = {};

      await Promise.all(
        properties.map(async (property) => {
          if (!isType(property, "relation")) return null;
          const relationId = property.config.database_id;
          if (!relationId) return null;
          const pages = await queryDatabase(relationId, undefined);
          relationPages[relationId] = pages;
          return pages;
        }),
      );

      return relationPages;
    },
    [properties],
  );
}

export function useDatabases() {
  const value = useCachedPromise(() => fetchDatabases());

  return { ...value, data: value.data ?? [] };
}

export function useDatabaseProperties(databaseId: string | null, filter?: (value: DatabaseProperty) => boolean) {
  const value = useCachedPromise(
    (id): Promise<DatabaseProperty[]> =>
      fetchDatabaseProperties(id).then((databaseProperties) => {
        if (databaseProperties && filter) {
          return databaseProperties.filter(filter);
        }
        return databaseProperties;
      }),
    [databaseId],
    { execute: !!databaseId },
  );

  return { ...value, data: value.data ?? [] };
}

export function useVisibleDatabasePropIds(
  databaseId: string,
  quicklinkProps?: string[],
): {
  visiblePropIds?: string[];
  isLoading: boolean;
  setVisiblePropIds: (value: string[]) => Promise<void> | void;
} {
  if (quicklinkProps) {
    const [visiblePropIds, setVisiblePropIds] = useState(quicklinkProps);
    return { visiblePropIds, isLoading: false, setVisiblePropIds };
  } else {
    const { data, isLoading, setDatabaseView } = useDatabasesView(databaseId);
    const setVisiblePropIds = (props?: string[]) => setDatabaseView({ ...data, create_properties: props });
    return { visiblePropIds: data.create_properties, isLoading, setVisiblePropIds };
  }
}

export function useDatabasesView(databaseId: string) {
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const data = await LocalStorage.getItem<string>("DATABASES_VIEWS");

    if (!data) return {};

    return JSON.parse(data) as { [databaseId: string]: DatabaseView | undefined };
  });

  async function setDatabaseView(view: DatabaseView) {
    if (!data) return;

    await LocalStorage.setItem("DATABASES_VIEWS", JSON.stringify({ ...data, [databaseId]: view }));
    mutate();
    showToast({ title: "View updated" });
  }

  return {
    data: data?.[databaseId] || {},
    isLoading,
    setDatabaseView,
  };
}

export class RecentPage {
  id: string;
  last_visited_time: number;
  type: Page["object"];

  constructor(page: Page) {
    this.id = page.id;
    this.last_visited_time = Date.now();
    this.type = page.object;
  }

  updateLastVisitedTime() {
    this.last_visited_time = Date.now();
  }
}

export function useRecentPages() {
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    let data = await LocalStorage.getItem("RECENT_PAGES");

    // try migrating the old recently opened pages to the new format
    if (!data || typeof data !== "string") {
      const oldData = await LocalStorage.getItem("RECENTLY_OPENED_PAGES");

      // no old data either, return an empty array
      if (!oldData || typeof oldData !== "string") return [];

      const oldRecentPages = JSON.parse(oldData) as Page[];

      data = JSON.stringify(oldRecentPages.map((p) => new RecentPage(p)));

      // save the new data
      await LocalStorage.setItem("RECENT_PAGES", data);
      // remove the old data
      await LocalStorage.removeItem("RECENTLY_OPENED_PAGES");
    }

    const recentPages = JSON.parse(data) as RecentPage[];

    // for each RecentPage object, turn it into a Page object, and filter out any undefined values
    const recentPagesWithContent: Page[] = (
      await Promise.all(
        recentPages.map((p) => {
          // convert each RecentPage object into a Page object
          // don't error if the page is not found
          if (p.type === "page") {
            return fetchPage(p.id, true);
          } else {
            return fetchDatabase(p.id, true);
          }
        }),
      )
    ).filter((x): x is Page => x !== undefined);

    return recentPagesWithContent;
  });

  async function setRecentPage(page: Page) {
    if (!data) return;

    let recentPages = [...data].map((p) => new RecentPage(p));

    // check if the page is already in the recent pages
    const cachedPageIndex = data.findIndex((x) => x.id === page.id);

    if (cachedPageIndex > -1) {
      // if the page is already in the recent pages, update the last visited time
      recentPages[cachedPageIndex].updateLastVisitedTime();
    } else {
      // otherwise, add the page to the recent pages
      recentPages.push(new RecentPage(page));
    }

    // sort by last visited time
    recentPages.sort((a: RecentPage, b: RecentPage) => {
      return (a.last_visited_time ?? 0) - (b.last_visited_time ?? 0);
    });

    // only keep the 20 most recent pages
    recentPages = recentPages.slice(0, 20);

    await LocalStorage.setItem("RECENT_PAGES", JSON.stringify(recentPages));
    mutate();
  }

  async function removeRecentPage(id: string) {
    if (!data) return;

    // remove the page from the recent pages
    const updatedPages = data.filter((page) => page.id !== id);

    await LocalStorage.setItem("RECENT_PAGES", JSON.stringify(updatedPages));
    mutate();
  }

  return {
    data,
    isLoading,
    mutate,
    setRecentPage,
    removeRecentPage,
  };
}

export function useSearchPages(query: string) {
  return useCachedPromise(search, [query], {
    keepPreviousData: true,
  });
}
