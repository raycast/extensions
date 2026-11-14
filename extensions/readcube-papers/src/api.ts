import { getPreferenceValues, LocalStorage } from "@raycast/api";

// ReadCube has no public API; these are the endpoints the web app (app.readcube.com) uses.
const SERVICES_URL = "https://services.readcube.com";
const SYNC_URL = "https://sync.readcube.com";
export const APP_URL = "https://app.readcube.com";
export const WEB_URL = "https://www.readcube.com";

const CLIENT_PARAMS = { client: "webapp" };
const COOKIE_STORAGE_KEY = "session-cookie";
const PAGE_SIZE = 50;

export interface Collection {
  id: string;
  name: string | null;
  shared: boolean;
  status: string;
}

export interface PaperList {
  id: string;
  name: string;
  parent_id?: string;
  deleted: boolean;
}

export interface Item {
  id: string;
  collection_id: string;
  item_type: string;
  deleted: boolean;
  article: {
    title?: string;
    authors?: string[];
    journal?: string;
    journal_abbrev?: string;
    year?: number;
    volume?: string;
    issue?: string;
    pagination?: string;
    abstract?: string;
  };
  ext_ids: {
    doi?: string;
    pmid?: string;
    arxiv?: string;
  };
  files?: { name: string; sha256: string; size: number }[];
  user_data: {
    star?: boolean;
    citekey?: string;
    created?: string;
    tags?: string[];
    notes?: string;
  };
}

export interface ItemsPage {
  items: Item[];
  total: number;
  scrollId?: string;
}

export class AuthError extends Error {}

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${SERVICES_URL}/authentication/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...CLIENT_PARAMS, email, password }),
    redirect: "manual",
  });

  if (response.status >= 400) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new AuthError(body?.message ?? `ReadCube sign-in failed (HTTP ${response.status})`);
  }

  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");
  if (!cookie) {
    throw new AuthError(
      "ReadCube didn't return a session. If you sign in with SSO, set the Session Cookie preference instead.",
    );
  }
  return cookie;
}

function parseSession(value: string | undefined): { email?: string; cookie?: string } | undefined {
  try {
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined; // a session saved by an older version
  }
}

async function getSessionCookie(forceLogin = false): Promise<string> {
  const { email, password, sessionCookie } = getPreferenceValues<Preferences>();
  if (sessionCookie?.trim()) {
    return sessionCookie.trim().replace(/^cookie:\s*/i, "");
  }
  if (!email || !password) {
    throw new AuthError("Set your ReadCube email and password (or a session cookie) in the extension preferences.");
  }

  // The cached session belongs to one account; ignore it once the configured email changes.
  if (!forceLogin) {
    const cached = await LocalStorage.getItem<string>(COOKIE_STORAGE_KEY);
    const session = parseSession(cached);
    if (session?.email === email && session.cookie) return session.cookie;
  }
  const cookie = await login(email, password);
  await LocalStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify({ email, cookie }));
  return cookie;
}

async function request<T>(url: string, params: Record<string, string | string[] | undefined> = {}): Promise<T> {
  const search = new URLSearchParams(CLIENT_PARAMS);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, v);
  }
  const fullUrl = `${url}?${search}`;

  const send = async (cookie: string) => fetch(fullUrl, { headers: { Accept: "application/json", Cookie: cookie } });

  let response = await send(await getSessionCookie());
  if (response.status === 401 && !getPreferenceValues<Preferences>().sessionCookie?.trim()) {
    // The cached session expired; sign in again once.
    response = await send(await getSessionCookie(true));
  }
  if (response.status === 401) {
    throw new AuthError("ReadCube rejected the session. Check your credentials or session cookie.");
  }
  if (!response.ok) {
    throw new Error(`ReadCube request failed (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

export async function getCollections(): Promise<Collection[]> {
  const { collections } = await request<{ collections: Collection[] }>(`${SERVICES_URL}/collections`);
  return collections.filter((c) => c.status === "active");
}

export async function getLists(collectionId: string): Promise<PaperList[]> {
  const { lists } = await request<{ lists: PaperList[] }>(`${SYNC_URL}/collections/${collectionId}/lists`);
  return lists.filter((l) => !l.deleted);
}

export async function getItems(options: {
  collectionId: string;
  listId?: string;
  query?: string;
  scrollId?: string;
}): Promise<ItemsPage> {
  const { collectionId, listId, query, scrollId } = options;
  const path = listId ? `/collections/${collectionId}/lists/${listId}/items` : `/collections/${collectionId}/items`;
  const trimmed = query?.trim();

  const data = await request<{ items: Item[]; total: number; scroll_id?: string }>(`${SYNC_URL}${path}`, {
    size: String(PAGE_SIZE),
    query: trimmed || undefined,
    // Without a query, show the most recently added papers first; with one, keep relevance order.
    "sort[]": trimmed ? undefined : ["created,desc"],
    scroll_id: scrollId,
  });
  return {
    items: data.items.filter((i) => !i.deleted),
    total: data.total,
    scrollId: data.items.length === PAGE_SIZE ? data.scroll_id : undefined,
  };
}

export function collectionName(collection: Collection): string {
  return collection.name ?? "My Papers";
}

export function itemUrl(item: Item): string {
  return `${APP_URL}/library/${item.collection_id}/item/${item.id}`;
}

export function pdfUrl(item: Item): string | undefined {
  return item.files?.length ? `${WEB_URL}/library/${item.collection_id}:${item.id}` : undefined;
}

export function doiUrl(item: Item): string | undefined {
  return item.ext_ids.doi ? `https://doi.org/${item.ext_ids.doi}` : undefined;
}
