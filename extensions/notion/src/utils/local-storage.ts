import { setLocalStorageItem, getLocalStorageItem } from "@raycast/api";
import { Page, Database, DatabaseProperty, DatabaseView, User } from "./notion";

export async function storeRecentlyOpenedPage(page: Page) {
  const cachedRecentlyOpenPages = await loadRecentlyOpenedPages();
  const updatedRecentlyOpenPages = cachedRecentlyOpenPages ? cachedRecentlyOpenPages : [];

  const cachedPageIndex = updatedRecentlyOpenPages.findIndex(function (cp: Page) {
    return cp.id === page.id;
  });

  page.last_edited_time = Date.now();

  if (cachedPageIndex > -1) {
    updatedRecentlyOpenPages[cachedPageIndex] = page;
  } else {
    updatedRecentlyOpenPages.push(page);
  }

  updatedRecentlyOpenPages.sort(function (a: Page, b: Page) {
    if (a.last_edited_time > b.last_edited_time) {
      return -1;
    }
    if (a.last_edited_time < b.last_edited_time) {
      return 1;
    }
    return 0;
  });

  const data = JSON.stringify(updatedRecentlyOpenPages.slice(0, 20));
  await setLocalStorageItem("RECENTLY_OPENED_PAGES", data);
}

export async function loadRecentlyOpenedPages() {
  const data: string | undefined = await getLocalStorageItem("RECENTLY_OPENED_PAGES");
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function storeDatabaseView(databaseId: string, databaseView: DatabaseView) {
  const data = JSON.stringify(databaseView);
  await setLocalStorageItem("VIEW_DATABASE_" + databaseId, data);
}

export async function loadDatabaseView(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem("VIEW_DATABASE_" + databaseId);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function storeDatabases(database: Database[]) {
  const data = JSON.stringify(database);
  await setLocalStorageItem("DATABASES", data);
}

export async function loadDatabases() {
  const data: string | undefined = await getLocalStorageItem("DATABASES");
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function storeDatabaseProperties(databaseId: string, databaseProperties: DatabaseProperty[]) {
  const data = JSON.stringify(databaseProperties);
  await setLocalStorageItem("DATABASE_PROPERTIES_" + databaseId, data);
}

export async function loadDatabaseProperties(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem("DATABASE_PROPERTIES_" + databaseId);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function storeDatabasePages(databaseId: string, pages: Page[]) {
  const data = JSON.stringify(pages);
  await setLocalStorageItem("PAGES_DATABASE_" + databaseId, data);
}

export async function loadDatabasePages(databaseId: string) {
  const data: string | undefined = await getLocalStorageItem("PAGES_DATABASE_" + databaseId);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function storeUsers(users: User[]) {
  const data = JSON.stringify(users);
  await setLocalStorageItem("USERS", data);
}

export async function loadUsers() {
  const data: string | undefined = await getLocalStorageItem("USERS");
  return data !== undefined ? JSON.parse(data) : undefined;
}
