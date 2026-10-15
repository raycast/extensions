import http from "node:http";
import https from "node:https";
import { normalizeSiteUrl, Site } from "./sites";

export class WordPressError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** WordPress error code, e.g. rest_no_route. */
    readonly code?: string,
  ) {
    super(message);
  }
}

interface RawResponse {
  status: number;
  body: string;
}

function rawRequest(
  url: URL,
  headers: Record<string, string>,
  allowSelfSigned: boolean,
  body?: string,
  timeout = 15000,
  redirects = 3,
): Promise<RawResponse> {
  const client = url.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? headers : { ...headers, "Content-Length": String(Buffer.byteLength(body)) },
        rejectUnauthorized: !allowSelfSigned,
        timeout,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
          res.resume();
          const next = new URL(res.headers.location, url);
          // Only send the application password back to the same host, and never over plain HTTP
          // once we started on HTTPS.
          const nextHeaders = { ...headers };
          if (next.host !== url.host || (url.protocol === "https:" && next.protocol !== "https:")) {
            delete nextHeaders.Authorization;
          }
          // 301, 302 and 303 turn a POST into a GET, like browsers do; 307 and 308 keep it.
          const nextBody = status === 307 || status === 308 ? body : undefined;
          if (nextBody === undefined) {
            delete nextHeaders["Content-Type"];
            delete nextHeaders["X-HTTP-Method-Override"];
          }
          rawRequest(next, nextHeaders, allowSelfSigned, nextBody, timeout, redirects - 1).then(resolve, reject);
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status, body: data }));
      },
    );
    req.on("timeout", () =>
      req.destroy(new Error(`${url.host} didn't answer within ${Math.round(timeout / 1000)} seconds`)),
    );
    req.on("error", reject);
    req.end(body);
  });
}

function connectionError(site: Site, error: unknown): WordPressError {
  const message = error instanceof Error ? error.message : String(error);
  if (/certificate|self[- ]signed|CERT_/i.test(message)) {
    return new WordPressError(`${site.name}: HTTPS certificate isn't trusted. Enable "Allow self-signed certificate".`);
  }
  return new WordPressError(`${site.name}: ${message}`);
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
  /** In ms. Defaults to 15 seconds; whole-site scans get longer. */
  timeout?: number;
}

/**
 * Calls the WordPress REST API. Uses `?rest_route=` so it works with and without pretty permalinks.
 */
export async function wpRequest<T>(
  site: Site,
  route: string,
  params: Record<string, string> = {},
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${site.url}/`);
  url.searchParams.set("rest_route", route);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (site.username && site.appPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${site.username}:${site.appPassword}`).toString("base64")}`;
  }
  let body: string | undefined;
  if (options.body !== undefined || (options.method && options.method !== "GET")) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body ?? {});
  }
  if (options.method && options.method !== "POST" && options.method !== "GET") {
    // Some hosts block DELETE/PUT; WordPress honours this override header.
    headers["X-HTTP-Method-Override"] = options.method;
  }

  let response: RawResponse;
  try {
    response = await rawRequest(url, headers, site.allowSelfSigned ?? false, body, options.timeout);
  } catch (error) {
    throw connectionError(site, error);
  }

  let json: unknown;
  try {
    json = JSON.parse(response.body);
  } catch {
    throw new WordPressError(`${site.name} didn't return JSON. Is this a WordPress site?`, response.status);
  }
  if (response.status >= 400) {
    const { message, code } = json as { message?: string; code?: string };
    throw new WordPressError(
      `${site.name}: ${decodeEntities(message ?? `HTTP ${response.status}`)}`,
      response.status,
      code,
    );
  }
  return json as T;
}

export interface PostType {
  slug: string;
  name: string;
  restBase: string;
  restNamespace: string;
}

interface RawPostType {
  slug: string;
  name: string;
  rest_base?: string;
  rest_namespace?: string;
  viewable?: boolean;
}

// Post types that never open in the Bricks builder.
const IGNORED_TYPES = new Set([
  "attachment",
  "nav_menu_item",
  "wp_block",
  "wp_template",
  "wp_template_part",
  "wp_navigation",
  "wp_global_styles",
  "wp_font_family",
  "wp_font_face",
]);

function isAuthenticated(site: Site) {
  return Boolean(site.username && site.appPassword);
}

export async function getPostTypes(site: Site): Promise<PostType[]> {
  const raw = await wpRequest<Record<string, RawPostType>>(site, "/wp/v2/types", {
    context: isAuthenticated(site) ? "edit" : "view",
  });
  return Object.values(raw)
    .filter((t) => t.rest_base && !IGNORED_TYPES.has(t.slug) && t.viewable !== false)
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      restBase: t.rest_base as string,
      restNamespace: t.rest_namespace ?? "wp/v2",
    }));
}

export interface ContentItem {
  id: number;
  title: string;
  link: string;
  builderUrl: string;
  status: string;
  type: { slug: string; name: string };
  /** Last modified, in ms since epoch (a number so it survives Raycast's JSON cache). */
  modified: number;
  /** Only known when the helper plugin is installed. */
  usesBricks?: boolean;
  /** Bricks template type (header, footer, content, …), from the helper plugin. */
  templateType?: string;
  /** Where a Bricks template applies, e.g. "Entire website" or "Pages: Home". From the helper plugin. */
  conditions?: string[];
}

export interface TruncatedType {
  label: string;
  total: number;
  returned: number;
}

export interface ContentList {
  items: ContentItem[];
  /** Whether the Bricks Raycast Helper plugin answered (it's the only source of Bricks templates). */
  viaHelper: boolean;
  /** Post types with more items than were listed; search the site to find the rest. */
  truncated: TruncatedType[];
}

interface HelperContent {
  items: HelperItem[];
  types?: { slug: string; label: string; total: number; returned: number; truncated: boolean }[];
}

export const HELPER_NAMESPACE = "bricks-raycast/v1";

interface HelperItem {
  id: number;
  title: string;
  type: string;
  type_label: string;
  status: string;
  link: string;
  builder_url: string;
  modified_gmt: string;
  uses_bricks: boolean;
  template_type: string | null;
  conditions?: string[] | null;
}

function fromHelper(item: HelperItem): ContentItem {
  return {
    id: item.id,
    title: item.title || "(no title)",
    link: item.link,
    builderUrl: item.builder_url,
    status: item.status,
    type: { slug: item.type, name: item.type_label },
    modified: Date.parse(item.modified_gmt),
    usesBricks: item.uses_bricks,
    templateType: item.template_type ?? undefined,
    conditions: item.conditions?.map(decodeEntities) ?? undefined,
  };
}

export const isMissingRoute = (error: unknown) => error instanceof WordPressError && error.code === "rest_no_route";

interface RawPost {
  id: number;
  title?: { rendered?: string; raw?: string };
  link: string;
  status: string;
  modified_gmt: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES_PER_TYPE = 20;

async function listType(site: Site, type: PostType): Promise<ContentItem[]> {
  const authed = isAuthenticated(site);
  const items: ContentItem[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_TYPE; page++) {
    const params: Record<string, string> = {
      per_page: String(PAGE_SIZE),
      page: String(page),
      orderby: "modified",
      _fields: "id,title,link,status,modified_gmt",
      context: authed ? "edit" : "view",
    };
    if (authed) params.status = "publish,future,draft,pending,private";

    const posts = await wpRequest<RawPost[]>(site, `/${type.restNamespace}/${type.restBase}`, params);
    for (const post of posts) {
      items.push({
        id: post.id,
        title: decodeEntities(post.title?.raw || post.title?.rendered || "") || "(no title)",
        link: post.link,
        builderUrl: builderUrl(post.link),
        status: post.status,
        type: { slug: type.slug, name: type.name },
        modified: Date.parse(`${post.modified_gmt}Z`),
      });
    }
    if (posts.length < PAGE_SIZE) break;
  }
  return items;
}

/** Without the helper plugin: one paginated REST listing per post type (no Bricks templates). */
async function listViaRest(site: Site): Promise<ContentItem[]> {
  const types = await getPostTypes(site);
  const results = await Promise.allSettled(types.map((type) => listType(site, type)));

  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (items.length === 0) {
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failure) throw failure.reason;
  }
  return items.sort((a, b) => b.modified - a.modified);
}

/**
 * Lists everything that can open in Bricks, newest first. Uses the helper plugin's single endpoint
 * when it's installed, otherwise the core REST API. The list is fetched once and filtered locally.
 */
export async function listContent(site: Site): Promise<ContentList> {
  if (isAuthenticated(site)) {
    try {
      const { items, types = [] } = await wpRequest<HelperContent>(site, `/${HELPER_NAMESPACE}/content`);
      return {
        items: items.map(fromHelper),
        viaHelper: true,
        truncated: types.filter((t) => t.truncated).map(({ label, total, returned }) => ({ label, total, returned })),
      };
    } catch (error) {
      if (!isMissingRoute(error)) throw error;
    }
  }
  return { items: await listViaRest(site), viaHelper: false, truncated: [] };
}

/** Server-side search through the helper plugin, for sites with more content than the list holds. */
export async function searchContentRemote(site: Site, search: string): Promise<ContentItem[]> {
  const { items } = await wpRequest<HelperContent>(site, `/${HELPER_NAMESPACE}/content`, {
    search,
    per_type: "50",
  });
  return items.map(fromHelper);
}

/**
 * Creates a draft page, post or Bricks template. Bricks templates need the helper plugin;
 * pages and posts fall back to the core REST API without it.
 */
export async function createContent(
  site: Site,
  input: { type: string; title: string; templateType?: string },
): Promise<ContentItem> {
  if (isAuthenticated(site)) {
    try {
      const item = await wpRequest<HelperItem>(
        site,
        `/${HELPER_NAMESPACE}/create`,
        {},
        { method: "POST", body: { type: input.type, title: input.title, template_type: input.templateType } },
      );
      return fromHelper(item);
    } catch (error) {
      if (!isMissingRoute(error)) throw error;
    }
  } else {
    throw new WordPressError(`Add your username and an application password to ${site.name} to create content`);
  }

  if (input.type === "bricks_template") {
    throw new WordPressError(`Install the Bricks Raycast Helper plugin on ${site.name} to create templates`);
  }
  const route = input.type === "post" ? "/wp/v2/posts" : "/wp/v2/pages";
  const post = await wpRequest<RawPost>(
    site,
    route,
    { _fields: "id,title,link,status,modified_gmt", context: "edit" },
    { method: "POST", body: { title: input.title, status: "draft" } },
  );
  return {
    id: post.id,
    title: input.title,
    link: post.link,
    builderUrl: builderUrl(post.link),
    status: post.status,
    type: { slug: input.type, name: input.type === "post" ? "Post" : "Page" },
    modified: Date.parse(`${post.modified_gmt}Z`),
  };
}

/** Finds a post's frontend and builder links by ID. */
export async function findPost(site: Site, id: number): Promise<{ link: string; builderUrl: string } | undefined> {
  if (isAuthenticated(site)) {
    try {
      const item = await wpRequest<HelperItem>(site, `/${HELPER_NAMESPACE}/post/${id}`);
      return { link: item.link, builderUrl: item.builder_url };
    } catch (error) {
      if (error instanceof WordPressError && error.code === "not_found") return undefined;
      if (!isMissingRoute(error)) throw error;
    }
  }

  const types = await getPostTypes(site);
  for (const type of types) {
    try {
      const post = await wpRequest<{ link: string }>(site, `/${type.restNamespace}/${type.restBase}/${id}`, {
        _fields: "link",
        context: isAuthenticated(site) ? "edit" : "view",
      });
      if (post.link) return { link: post.link, builderUrl: builderUrl(post.link) };
    } catch {
      // Not this post type.
    }
  }
  return undefined;
}

export interface ConnectionCheck {
  siteName: string;
  /** The site's own home URL, when it differs from the one entered (e.g. it redirects to www). */
  canonicalUrl?: string;
  user?: string;
  hasBricks: boolean;
  hasHelper: boolean;
}

export async function checkConnection(site: Site): Promise<ConnectionCheck> {
  const index = await wpRequest<{ name: string; home?: string; namespaces?: string[] }>(site, "/");
  const namespaces = index.namespaces ?? [];

  // Talk to the address WordPress calls home, so later requests don't go through a redirect
  // (which would also drop the application password on a different host).
  let canonicalUrl: string | undefined;
  try {
    const home = index.home ? normalizeSiteUrl(index.home) : undefined;
    if (home && home !== site.url) canonicalUrl = home;
  } catch {
    canonicalUrl = undefined;
  }
  const target = canonicalUrl ? { ...site, url: canonicalUrl } : site;

  let user: string | undefined;
  if (isAuthenticated(target)) {
    const me = await wpRequest<{ name: string }>(target, "/wp/v2/users/me", { context: "edit" });
    user = me.name;
  }
  return {
    siteName: decodeEntities(index.name),
    canonicalUrl,
    user,
    hasBricks: namespaces.some((ns) => ns.startsWith("bricks/")),
    hasHelper: namespaces.includes(HELPER_NAMESPACE),
  };
}

export function builderUrl(link: string): string {
  const url = new URL(link);
  url.hash = "";
  url.searchParams.set("bricks", "run");
  return url.toString();
}

export function liveUrl(link: string): string {
  const url = new URL(link);
  url.searchParams.delete("bricks");
  return url.toString();
}

export function adminEditUrl(site: Site, id: number): string {
  return `${site.url}/wp-admin/post.php?post=${id}&action=edit`;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}
