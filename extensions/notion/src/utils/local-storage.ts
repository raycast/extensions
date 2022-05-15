import { LocalStorage } from "@raycast/api";
import { Page, Database, DatabaseProperty, DatabaseView, User } from "./notion";

export async function storeRecentlyOpenedPage(page: Page): Promise<void> {
  const recentlyOpenPages = await loadRecentlyOpenedPages();

  const cachedPageIndex = recentlyOpenPages.findIndex(function (cp: Page) {
    return cp.id === page.id;
  });

  page.last_edited_time = `${Date.now()}`;

  if (cachedPageIndex > -1) {
    recentlyOpenPages[cachedPageIndex] = page;
  } else {
    recentlyOpenPages.push(page);
  }

  recentlyOpenPages.sort(function (a: Page, b: Page) {
    if ((a.last_edited_time || 0) > (b.last_edited_time || 0)) {
      return -1;
    }
    if ((a.last_edited_time || 0) < (b.last_edited_time || 0)) {
      return 1;
    }
    return 0;
  });

  const data = JSON.stringify(recentlyOpenPages.slice(0, 20));
  await LocalStorage.setItem("RECENTLY_OPENED_PAGES", data);
}

export async function loadRecentlyOpenedPages(): Promise<Page[]> {
  const data: string | undefined = await LocalStorage.getItem("RECENTLY_OPENED_PAGES");
  return data !== undefined ? JSON.parse(data) || [] : [];
}

export async function storeDatabaseView(databaseId: string, databaseView: DatabaseView): Promise<void> {
  const data = JSON.stringify(databaseView);
  await LocalStorage.setItem("VIEW_DATABASE_" + databaseId, data);
}

export async function loadDatabaseView(databaseId: string): Promise<DatabaseView | undefined> {
  const data: string | undefined = await LocalStorage.getItem("VIEW_DATABASE_" + databaseId);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function storeDatabases(database: Database[]): Promise<void> {
  const data = JSON.stringify(database);
  await LocalStorage.setItem("DATABASES", data);
}

export async function loadDatabases(): Promise<Database[]> {
  const data: string | undefined = await LocalStorage.getItem("DATABASES");
  return data !== undefined ? JSON.parse(data) || [] : [];
}

export async function storeDatabaseProperties(
  databaseId: string,
  databaseProperties: DatabaseProperty[]
): Promise<void> {
  const data = JSON.stringify(databaseProperties);
  await LocalStorage.setItem("DATABASE_PROPERTIES_" + databaseId, data);
}

export async function loadDatabaseProperties(databaseId: string): Promise<DatabaseProperty[]> {
  const data: string | undefined = await LocalStorage.getItem("DATABASE_PROPERTIES_" + databaseId);
  return data !== undefined ? JSON.parse(data) || [] : [];
}

export async function storeDatabasePages(databaseId: string, pages: Page[]): Promise<void> {
  const data = JSON.stringify(pages);
  await LocalStorage.setItem("PAGES_DATABASE_" + databaseId, data);
}

export async function loadDatabasePages(databaseId: string): Promise<Page[]> {
  const data: string | undefined = await LocalStorage.getItem("PAGES_DATABASE_" + databaseId);
  return data !== undefined ? JSON.parse(data) || [] : [];
}

export async function storeUsers(users: User[]): Promise<void> {
  const data = JSON.stringify(users);
  await LocalStorage.setItem("USERS", data);
}

export async function loadUsers(): Promise<User[]> {
  const data: string | undefined = await LocalStorage.getItem("USERS");
  return data !== undefined ? JSON.parse(data) || [] : [];
}
