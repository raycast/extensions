import { LocalStorage, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { fetchDatabaseProperties, fetchUsers, fetchDatabases, queryDatabase, search } from "../utils/notion";
import { DatabaseProperty, DatabaseView, Page } from "../utils/types";

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
          if (property.type !== "relation" || !property.relation_id) return null;
          const pages = await queryDatabase(property.relation_id, undefined);
          relationPages[property.relation_id] = pages;
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

export function useDatabaseProperties(databaseId: string | null) {
  const value = useCachedPromise((id) => fetchDatabaseProperties(id), [databaseId], { execute: !!databaseId });

  return { ...value, data: value.data ?? [] };
}

export function useDatabasesView(databaseId: string) {
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const data = await LocalStorage.getItem("DATABASES_VIEWS");

    if (!data || typeof data !== "string") return {};

    return JSON.parse(data) as { [databaseId: string]: DatabaseView | undefined };
  });

  async function setDatabaseView(view: DatabaseView) {
    if (!data) return;

    await LocalStorage.setItem("DATABASES_VIEWS", JSON.stringify({ ...data, [databaseId]: view }));
    mutate();
    showToast({ title: "View updated" });
  }

  return {
    data: data?.[databaseId],
    isLoading,
    mutate,
    setDatabaseView,
  };
}

export function useRecentPages() {
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const data = await LocalStorage.getItem("RECENTLY_OPENED_PAGES");
    if (!data || typeof data !== "string") return [];
    return JSON.parse(data) as Page[];
  });

  async function setRecentPage(page: Page) {
    if (!data) return;

    const updatedPages = [...data];

    const cachedPageIndex = data.findIndex((x) => x.id === page.id);
    page.last_edited_time = Date.now();

    if (cachedPageIndex > -1) {
      updatedPages[cachedPageIndex] = page;
    } else {
      updatedPages.push(page);
    }

    updatedPages.sort((a: Page, b: Page) => {
      if ((a.last_edited_time || 0) > (b.last_edited_time || 0)) {
        return -1;
      }
      if ((a.last_edited_time || 0) < (b.last_edited_time || 0)) {
        return 1;
      }
      return 0;
    });

    const recentPages = updatedPages.slice(0, 20);

    await LocalStorage.setItem("RECENTLY_OPENED_PAGES", JSON.stringify(recentPages));
    mutate();
  }

  async function removeRecentPage(id: string) {
    if (!data) return;

    const updatedPages = data.filter((page) => page.id !== id);

    console.log(updatedPages);
    await LocalStorage.setItem("RECENTLY_OPENED_PAGES", JSON.stringify(updatedPages));
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
  return useCachedPromise((query) => search(query), [query], {
    keepPreviousData: true,
  });
}
