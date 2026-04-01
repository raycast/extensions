import { getPreferenceValues } from "@raycast/api";
import bcrypt from "bcryptjs";

export interface Article {
  id: string;
  title: string;
  published: number;
  updated?: number;
  summary?: { content: string };
  content?: { content: string };
  author?: string;
  alternate?: { href: string }[];
  origin?: { streamId: string; title: string; htmlUrl?: string };
  categories: string[];
}

export interface StreamResponse {
  id: string;
  title: string;
  direction: string;
  updated: number;
  items: Article[];
  continuation?: string;
}

export interface Subscription {
  id: string;
  title: string;
  htmlUrl?: string;
  categories?: { id: string; label: string }[];
}

export interface UnreadCount {
  id: string;
  count: number;
}

interface SearchSeed {
  id: string;
  title: string;
  published: number;
  updated?: number;
  summary?: { content: string };
  content?: { content: string };
  author?: string;
  alternate?: { href: string }[];
  origin?: { streamId: string; title: string; htmlUrl?: string };
  categories: string[];
}

interface NonceResponse {
  nonce: string;
  salt1: string;
}

class FreshRSSClient {
  private baseUrl: string;
  private username: string;
  private apiPassword: string;
  private debugLogging: boolean;
  private authToken: string | null = null;
  private webCookie: string | null = null;
  private articleCache = new Map<string, Article>();

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.baseUrl = prefs.baseUrl.replace(/\/+$/, "");
    this.username = prefs.username;
    this.apiPassword = prefs.apiPassword;
    this.debugLogging = Boolean(prefs.debugLogging);
  }

  private get apiBase(): string {
    return `${this.baseUrl}/api/greader.php`;
  }

  private logDebug(message: string, extra?: unknown): void {
    if (!this.debugLogging) return;
    if (extra === undefined) {
      console.log(`[FreshRSS] ${message}`);
    } else {
      console.log(`[FreshRSS] ${message}`, extra);
    }
  }

  private resetApiAuth(): void {
    this.authToken = null;
  }

  private resetWebAuth(): void {
    this.webCookie = null;
  }

  private collectCookies(response: Response, cookieMap: Map<string, string>) {
    for (const c of response.headers.getSetCookie()) {
      const [nameValue] = c.split(";");
      const eq = nameValue.indexOf("=");
      if (eq > 0) {
        cookieMap.set(nameValue.slice(0, eq).trim(), nameValue.slice(eq + 1).trim());
      }
    }
  }

  private serializeCookies(cookieMap: Map<string, string>): string {
    return [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private async ensureAuth(): Promise<void> {
    if (this.authToken) return;
    this.logDebug("Requesting greader auth token");
    const body = new URLSearchParams({
      Email: this.username,
      Passwd: this.apiPassword,
    });
    const response = await fetch(`${this.apiBase}/accounts/ClientLogin`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await response.text();
    const match = text.match(/Auth=(.+)/);
    if (!match) throw new Error("Auth failed");
    this.authToken = match[1].trim();
    this.logDebug("Received greader auth token");
  }

  private async fetchWithApiAuth(path: string, init?: RequestInit, retry = true): Promise<Response> {
    await this.ensureAuth();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `GoogleLogin auth=${this.authToken}`);

    const response = await fetch(path, {
      ...init,
      headers,
    });

    if (retry && (response.status === 401 || response.status === 403)) {
      this.logDebug("API auth expired, retrying request", {
        path,
        status: response.status,
      });
      this.resetApiAuth();
      return this.fetchWithApiAuth(path, init, false);
    }

    return response;
  }

  private async ensureWebAuth(): Promise<void> {
    if (this.webCookie) return;

    this.logDebug("Requesting FreshRSS web session");
    const cookieMap = new Map<string, string>();
    const loginPageRes = await fetch(`${this.baseUrl}/i/?c=auth&a=login`);
    if (!loginPageRes.ok) {
      throw new Error(`Login page request failed (${loginPageRes.status})`);
    }
    this.collectCookies(loginPageRes, cookieMap);
    const loginPageHtml = await loginPageRes.text();
    const csrf = loginPageHtml.match(/name="_csrf" value="([^"]+)"/)?.[1];
    if (!csrf) {
      throw new Error("Unable to extract FreshRSS CSRF token");
    }

    const nonceRes = await fetch(`${this.baseUrl}/i/?c=javascript&a=nonce&user=${encodeURIComponent(this.username)}`, {
      headers: { Cookie: this.serializeCookies(cookieMap) },
    });
    if (!nonceRes.ok) {
      throw new Error(`Nonce request failed (${nonceRes.status})`);
    }

    this.collectCookies(nonceRes, cookieMap);
    const { nonce, salt1 } = (await nonceRes.json()) as NonceResponse;
    const hash = await bcrypt.hash(this.apiPassword, salt1);
    const challengeSalt = await bcrypt.genSalt(4);
    const challenge = await bcrypt.hash(hash + nonce, challengeSalt);

    const loginRes = await fetch(`${this.baseUrl}/i/?c=auth&a=login`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: this.serializeCookies(cookieMap),
      },
      body: new URLSearchParams({
        username: this.username,
        challenge,
        _csrf: csrf,
      }).toString(),
    });

    this.collectCookies(loginRes, cookieMap);
    if (loginRes.status >= 400) {
      const body = await loginRes.text().catch(() => "");
      throw new Error(`Web login failed (${loginRes.status}): ${body.substring(0, 120) || "no body"}`);
    }

    const location = loginRes.headers.get("location");
    if (location) {
      const redirectUrl = location.startsWith("http") ? location : `${this.baseUrl}${location}`;
      const followRes = await fetch(redirectUrl, {
        redirect: "manual",
        headers: { Cookie: this.serializeCookies(cookieMap) },
      });
      this.collectCookies(followRes, cookieMap);
    }

    this.webCookie = this.serializeCookies(cookieMap);
    if (!this.webCookie) {
      throw new Error("Web login succeeded without session cookies");
    }
    this.logDebug("FreshRSS web session established");
  }

  private async fetchWithWebAuth(url: string, retry = true): Promise<Response> {
    await this.ensureWebAuth();
    const response = await fetch(url, {
      headers: { Cookie: this.webCookie ?? "" },
    });

    if (retry && (response.status === 401 || response.status === 403)) {
      this.logDebug("Web auth expired, retrying request", {
        url,
        status: response.status,
      });
      this.resetWebAuth();
      await this.ensureWebAuth();
      return this.fetchWithWebAuth(url, false);
    }

    return response;
  }

  private getItemTag(item: string, tag: string): string {
    const match = item.match(
      new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`),
    );
    return match ? (match[1] || match[2] || "").trim() : "";
  }

  async searchWeb(
    query: string,
    options?: {
      stream?: string;
      continuation?: string;
      count?: number;
      excludeTag?: string;
      includeTag?: string;
      since?: number;
    },
  ): Promise<StreamResponse> {
    const targetCount = options?.count ?? 50;
    const stream = options?.stream ?? "user/-/state/com.google/reading-list";
    const matchedItems: Article[] = [];
    const seenIds = new Set<string>();
    let offset = Number(options?.continuation ?? "0");

    try {
      while (matchedItems.length < targetCount) {
        const pageSize = Math.min(Math.max(targetCount, 25), 50);
        const response = await this.fetchWithWebAuth(
          `${this.baseUrl}/i/?a=rss&search=${encodeURIComponent(query)}&nb=${pageSize}&offset=${offset}`,
        );

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`Search request failed (${response.status}): ${body.substring(0, 120) || "no body"}`);
        }

        const xml = await response.text();
        const seeds = this.parseSearchRSS(xml);
        if (seeds.length === 0) {
          return {
            id: stream,
            title: "Search Results",
            direction: "ltr",
            updated: Math.floor(Date.now() / 1000),
            items: matchedItems,
          };
        }

        const hydrated = await this.getArticlesByIds([...new Set(seeds.map((seed) => seed.id).filter(Boolean))]);
        const items = seeds
          .map((seed) => hydrated.get(seed.id) ?? this.seedToArticle(seed))
          .filter((article) =>
            this.articleMatchesFilters(article, stream, {
              excludeTag: options?.excludeTag,
              includeTag: options?.includeTag,
              since: options?.since,
            }),
          );

        for (const item of items) {
          if (seenIds.has(item.id)) continue;
          matchedItems.push(item);
          seenIds.add(item.id);
          if (matchedItems.length >= targetCount) break;
        }

        if (seeds.length < pageSize) {
          offset = -1;
          break;
        }

        offset += seeds.length;
      }

      this.logDebug("FreshRSS search completed", {
        query,
        count: matchedItems.length,
        continuation: offset >= 0 ? String(offset) : undefined,
      });

      return {
        id: stream,
        title: "Search Results",
        direction: "ltr",
        updated: Math.floor(Date.now() / 1000),
        items: matchedItems,
        continuation: offset >= 0 ? String(offset) : undefined,
      };
    } catch (error) {
      throw new Error(`FreshRSS search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseSearchRSS(xml: string): SearchSeed[] {
    const items: SearchSeed[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];
      const guid = this.getItemTag(item, "guid");
      const link = this.getItemTag(item, "link") || guid;
      const pubDate = this.getItemTag(item, "pubDate");
      const description = this.getItemTag(item, "description");
      const source = item.match(/<source[^>]*>([^<]*)<\/source>/)?.[1] ?? "";

      items.push({
        id: guid || link,
        title: this.getItemTag(item, "title") || "Untitled",
        published: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
        summary: description ? { content: description } : undefined,
        content: description ? { content: description } : undefined,
        author: this.getItemTag(item, "author") || undefined,
        alternate: link ? [{ href: link }] : [],
        origin: { streamId: "", title: source },
        categories: ["user/-/state/com.google/reading-list"],
      });
    }

    return items;
  }

  private seedToArticle(seed: SearchSeed): Article {
    return {
      id: seed.id,
      title: seed.title,
      published: seed.published,
      updated: seed.updated,
      summary: seed.summary,
      content: seed.content,
      author: seed.author,
      alternate: seed.alternate,
      origin: seed.origin,
      categories: seed.categories,
    };
  }

  private async getArticlesByIds(ids: string[]): Promise<Map<string, Article>> {
    if (ids.length === 0) return new Map();

    const uniqueIds = [...new Set(ids)];
    const cachedArticles = new Map<string, Article>();
    const missingIds: string[] = [];

    for (const id of uniqueIds) {
      const cached = this.articleCache.get(id);
      if (cached) {
        cachedArticles.set(id, cached);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length === 0) {
      this.logDebug("Resolved articles from cache", {
        requested: uniqueIds.length,
      });
      return cachedArticles;
    }

    const body = new URLSearchParams();
    missingIds.forEach((id) => body.append("i", id));

    const response = await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/stream/items/contents?output=json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return cachedArticles;
    }

    const data = (await response.json()) as { items?: Article[] };
    for (const article of data.items ?? []) {
      this.articleCache.set(article.id, article);
      cachedArticles.set(article.id, article);
    }

    this.logDebug("Hydrated missing articles", {
      requested: uniqueIds.length,
      fetched: missingIds.length,
      resolved: cachedArticles.size,
    });

    return cachedArticles;
  }

  private articleMatchesFilters(
    article: Article,
    stream: string,
    options?: {
      excludeTag?: string;
      includeTag?: string;
      since?: number;
    },
  ): boolean {
    if (options?.excludeTag && article.categories.includes(options.excludeTag)) {
      return false;
    }
    if (options?.includeTag && !article.categories.includes(options.includeTag)) {
      return false;
    }
    if (
      stream === "user/-/state/com.google/starred" &&
      !article.categories.includes("user/-/state/com.google/starred")
    ) {
      return false;
    }
    if (
      stream &&
      !stream.startsWith("user/-/state/com.google/") &&
      !stream.startsWith("user/-/label/") &&
      article.origin?.streamId !== stream
    ) {
      return false;
    }
    if (stream.startsWith("user/-/label/") && !article.categories.includes(stream)) {
      return false;
    }
    if (options?.since) {
      const ts = article.updated ?? article.published;
      if (ts < options.since) return false;
    }
    return true;
  }

  private async getToken(): Promise<string> {
    const tokenRes = await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/token`);
    return (await tokenRes.text()).trim();
  }

  async getStream(
    stream: string,
    options?: {
      continuation?: string;
      count?: number;
      excludeTag?: string;
      includeTag?: string;
      since?: number;
    },
  ): Promise<StreamResponse> {
    const params = new URLSearchParams({
      output: "json",
      n: String(options?.count ?? 50),
      ck: String(Date.now()),
    });

    if (options?.continuation) params.set("c", options.continuation);
    if (options?.excludeTag) params.set("xt", options.excludeTag);
    if (options?.includeTag) params.set("it", options.includeTag);
    if (options?.since) params.set("ot", String(options.since));

    const url = `${this.apiBase}/reader/api/0/stream/contents/${stream}?${params.toString()}`;
    const response = await this.fetchWithApiAuth(url);

    if (!response.ok) throw new Error(`Stream failed (${response.status})`);
    return (await response.json()) as StreamResponse;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const response = await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/subscription/list?output=json`);
    if (!response.ok) throw new Error(`Subscriptions failed (${response.status})`);
    const data = (await response.json()) as { subscriptions: Subscription[] };
    return data.subscriptions;
  }

  async getUnreadCounts(): Promise<UnreadCount[]> {
    const response = await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/unread-count?output=json`);
    if (!response.ok) return [];
    const data = (await response.json()) as {
      unreadcounts?: UnreadCount[];
    };
    return data.unreadcounts ?? [];
  }

  async getUnreadCount(): Promise<number> {
    const counts = await this.getUnreadCounts();
    const item = counts.find((u: UnreadCount) => u.id === "user/-/state/com.google/reading-list");
    return item?.count ?? 0;
  }

  async markAsRead(id: string): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/edit-tag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        i: id,
        a: "user/-/state/com.google/read",
        T: token,
      }).toString(),
    });
    const article = this.articleCache.get(id);
    if (article && !article.categories.includes("user/-/state/com.google/read")) {
      article.categories = [...article.categories, "user/-/state/com.google/read"];
      this.articleCache.set(id, article);
    }
  }

  async markAsUnread(id: string): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/edit-tag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        i: id,
        r: "user/-/state/com.google/read",
        T: token,
      }).toString(),
    });
    const article = this.articleCache.get(id);
    if (article) {
      article.categories = article.categories.filter((category) => category !== "user/-/state/com.google/read");
      this.articleCache.set(id, article);
    }
  }

  async star(id: string): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/edit-tag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        i: id,
        a: "user/-/state/com.google/starred",
        T: token,
      }).toString(),
    });
    const article = this.articleCache.get(id);
    if (article && !article.categories.includes("user/-/state/com.google/starred")) {
      article.categories = [...article.categories, "user/-/state/com.google/starred"];
      this.articleCache.set(id, article);
    }
  }

  async unstar(id: string): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithApiAuth(`${this.apiBase}/reader/api/0/edit-tag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        i: id,
        r: "user/-/state/com.google/starred",
        T: token,
      }).toString(),
    });
    const article = this.articleCache.get(id);
    if (article) {
      article.categories = article.categories.filter((category) => category !== "user/-/state/com.google/starred");
      this.articleCache.set(id, article);
    }
  }
}

export const api = new FreshRSSClient();
