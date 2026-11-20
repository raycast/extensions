// Pure logic of the extension: no Raycast imports, so it can be tested with plain node (test/logic.test.ts).

export const SITE = "https://fileion.com";

export type Latest = { id: number; version: string; released_at: string | null };

export type Software = {
    slug: string;
    name: string;
    summary?: string | null;
    url: string;
    logo?: string | null;
    category?: { slug: string; title: string } | null;
    publisher?: { slug: string; name: string } | null;
    platforms: string[];
    latest?: Record<string, Latest | null>;
};

export type TrustStep = { status: string; text: string };

export type Trust = { ok: number; steps: Record<string, TrustStep> };

export type VersionDetail = { id: number; version: string; url: string; trust: Trust | null };

export type Update = {
    id: number;
    version: string;
    released_at: string;
    software: { slug: string; name: string };
    platform: string;
    url: string;
};

/** The order the detail panel lists platforms in */
export const PLATFORM_ORDER = ["windows", "mac", "linux", "android", "ios"];

/** The order the download actions come in: Mac first (this is a Mac extension), then the rest */
export const DOWNLOAD_ORDER = ["mac", "windows", "linux", "android", "ios"];

export const PLATFORM_NAMES: Record<string, string> = {
    windows: "Windows",
    mac: "Mac",
    linux: "Linux",
    android: "Android",
    ios: "iOS",
};

export const platformName = (slug: string) => PLATFORM_NAMES[slug] ?? slug;

/** The platform to read the trust line from: the first of PLATFORM_ORDER the title has a version for */
export function primaryPlatform(software: Software): string | undefined {
    return PLATFORM_ORDER.find((p) => software.latest?.[p]);
}

/** Never repeat a safety claim, whatever the API sent. */
const CLAIM = /\b(safe|virus[- ]free|malware[- ]free)\b/i;

/** "Fileion checks: 3 of 5 · 0 of 68 engines flagged it", or undefined (also when the text would make a safety claim) */
export function trustLine(trust: Trust | null | undefined): string | undefined {
    if (!trust?.steps) return undefined;
    const steps = Object.keys(trust.steps).length;
    const virustotal = trust.steps.virustotal?.text;
    const line = `Fileion checks: ${trust.ok} of ${steps}${virustotal ? ` · ${virustotal}` : ""}`;
    return CLAIM.test(line) ? undefined : line;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-21" → "Sep 21, 2026" (the day as given; no locale or time zone involved) */
export function day(value?: string | null): string {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${MONTHS[Number(match[2]) - 1] ?? ""} ${Number(match[3])}, ${match[1]}` : "";
}

/** The title's logo as an absolute address (the API gives a path like /curator/software/logos/…), or undefined */
export function logoUrl(logo?: string | null): string | undefined {
    if (!logo) return undefined;
    return logo.startsWith("/") ? `${SITE}${logo}` : /^https:\/\//.test(logo) ? logo : undefined;
}

/** The title's own address without a trailing slash */
const base = (url: string) => url.replace(/\/+$/, "");

/** The versions page of a title on one platform (a Fileion page, never a vendor file) */
export const versionsUrl = (software: Software, platform?: string) =>
    platform ? `${base(software.url)}/${platform}/versions` : software.url;

/** Fileion's own download page for a platform ({slug}.fileion.com/{platform}/download): the page, never a vendor file */
export const downloadUrl = (url: string, platform: string) => `${base(url)}/${platform}/download`;

/**
 * The platforms to offer a download for: those with a version (when the title's versions are loaded, else the ones it lists), the
 * preferred one first, then Mac, Windows, Linux, Android, iOS.
 */
export function downloadPlatforms(software: Pick<Software, "platforms" | "latest">, preferred?: string): string[] {
    const have = software.latest
        ? Object.keys(software.latest).filter((p) => software.latest?.[p])
        : software.platforms;
    const rank = (p: string) =>
        p === preferred ? -1 : DOWNLOAD_ORDER.indexOf(p) === -1 ? 99 : DOWNLOAD_ORDER.indexOf(p);
    return [...new Set(have)].sort((a, b) => rank(a) - rank(b));
}

/** The software address of an update row: its platform page ("https://x.fileion.com/mac") without the platform */
export const softwareUrlOf = (update: Update) => base(update.url).replace(new RegExp(`/${update.platform}$`), "");

export type DetailState = "loading" | "error" | "ready";

/** A value made safe for a Markdown table cell or heading: no pipe, backslash, markup, HTML or line break can change the layout */
export function escapeMd(value: string): string {
    return String(value)
        .replace(/\s+/g, " ")
        .replace(/[\\`*_{}[\]<>()#+!|~]/g, "\\$&")
        .trim();
}

/** The first sentence of a summary, or about `max` characters cut at a word, with an ellipsis when cut ("" when there is none) */
export function shortSummary(summary?: string | null, max = 160): string {
    const text = String(summary ?? "")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return "";
    const sentence = text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;
    if (sentence.length <= max) return sentence;
    const cut = sentence.slice(0, max).replace(/\s+\S*$/, "");
    return `${cut || sentence.slice(0, max)}…`;
}

/** The rows of the detail panel: one per platform the title has, "3.0.24 · Sep 21, 2026", never a row that stays "…" */
export function platformRows(
    software: Software,
    state: DetailState,
    latest?: Software["latest"],
): { platform: string; label: string; version: string; released: string; text: string }[] {
    return PLATFORM_ORDER.filter((p) => software.platforms.includes(p)).map((p) => {
        const l = latest?.[p];
        const version = l
            ? l.version
            : state === "loading"
              ? "Loading"
              : state === "error"
                ? "Could not load"
                : "No version yet";
        const released = l ? day(l.released_at) : "";
        return {
            platform: p,
            label: platformName(p),
            version,
            released,
            text: l ? `${l.version}${released ? ` · ${released}` : ""}` : version,
        };
    });
}

/**
 * The detail panel's body: the title, a short summary and a table of the versions (Platform | Version | Released). In the body, not in the
 * metadata strip, which Raycast squeezes (and truncates to "…") under a long body. Every value is escaped for Markdown.
 */
export function detailMarkdown(software: Software, state: DetailState, latest?: Software["latest"]): string {
    const rows = platformRows(software, state, latest);
    const summary = escapeMd(shortSummary(software.summary));
    const table = rows.length
        ? `| Platform | Version | Released |\n| --- | --- | --- |\n${rows
              .map((r) => `| ${escapeMd(r.label)} | ${escapeMd(r.version)} | ${escapeMd(r.released) || "-"} |`)
              .join("\n")}`
        : "";
    return [`# ${escapeMd(software.name)}`, summary, table].filter(Boolean).join("\n\n");
}

/** The selected result: the one Raycast reports when it is in the list, else the first (Raycast may not report the first selection) */
export function effectiveSelection(selected: string | null | undefined, slugs: string[]): string | null {
    return selected && slugs.includes(selected) ? selected : (slugs[0] ?? null);
}

export type Detail = { software: Software; platform?: string; trust?: string };

/** One title's detail: its versions (/software/{slug}) and the trust line of the primary platform (/versions/{id}); the trust is optional */
export async function loadDetail(
    slug: string,
    deps: { getSoftware: (slug: string) => Promise<Software>; getVersion: (id: number) => Promise<VersionDetail> },
    withTrust = true,
): Promise<Detail> {
    const software = await deps.getSoftware(slug);
    const platform = primaryPlatform(software);
    const detail: Detail = { software, platform };
    return withTrust ? { ...detail, trust: await loadTrust(detail, deps) } : detail;
}

/** The trust line of a loaded title's primary platform: one request (/versions/{id}), made only for the row the person selected */
export async function loadTrust(
    detail: Detail,
    deps: { getVersion: (id: number) => Promise<VersionDetail> },
): Promise<string | undefined> {
    const latest = detail.platform ? detail.software.latest?.[detail.platform] : undefined;
    const version = latest ? await deps.getVersion(latest.id).catch(() => undefined) : undefined;
    return trustLine(version?.trust);
}

/** How long to wait after a 429: the Retry-After seconds, at most capMs (a few seconds); 1 s when the header is missing or not a number */
export function retryAfterMs(header: string | null | undefined, capMs = 4000): number {
    const seconds = Number(header);
    return Math.min(capMs, Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000);
}

export const KEYS_URL = "https://developers.fileion.com/keys";
export const BUSY_MESSAGE = "You've reached the free limit";

// ---- Tools, Q&A and articles (the content API: /api/v1/tools, /questions, /articles) ----

export type ContentTool = {
    slug: string;
    name: string;
    summary?: string | null;
    category: { slug: string; title: string };
    url: string;
    image?: string | null;
    icon_url?: string | null;
    icon_svg?: string | null;
    updated_at?: string | null;
};

export type ContentQuestion = {
    slug: string;
    title: string;
    excerpt?: string | null;
    answer_count: number;
    accepted: boolean;
    url: string;
    created_at?: string | null;
    software?: { slug: string; name: string } | null;
    /** Only on one question (/questions/{slug}): the accepted answer, else the most voted one */
    answer?: { accepted: boolean; author?: string | null; excerpt?: string | null; created_at?: string | null } | null;
};

export type ContentArticle = {
    slug: string;
    title: string;
    excerpt?: string | null;
    type: "blog" | "news";
    topic?: { slug: string; title: string } | null;
    author?: string | null;
    published_at?: string | null;
    url: string;
    image?: string | null;
    reading_minutes?: number | null;
};

export type ArticleFilter = "all" | "blog" | "news";

/** A list path with the search text (when there is one) and 25 rows: "/tools?q=merge&per_page=25" */
function listPath(path: string, params: Record<string, string | undefined>): string {
    const query = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`);
    return `${path}?${[...query, "per_page=25"].join("&")}`;
}

/** At most 100 characters go to the API (its limit); an empty search lists everything, newest or alphabetical as the API sorts */
const clip = (text: string) => text.trim().slice(0, 100);

export const toolsPath = (q: string, sort?: "recent") => listPath("/tools", { q: clip(q), sort });

export const questionsPath = (q: string) => listPath("/questions", { q: clip(q) });

export const articlesPath = (q: string, type: ArticleFilter = "all") =>
    listPath("/articles", { q: clip(q), type: type === "all" ? undefined : type });

/** "1 answer" / "3 answers" / "No answers yet" */
export const answerLabel = (count: number) =>
    count === 1 ? "1 answer" : count > 1 ? `${count} answers` : "No answers yet";

/** The type shown on an article row */
export const articleTypeLabel = (type: string) => (type === "news" ? "News" : "Blog");

/** An image address the API gave (a tool's or an article's picture): the same rule as a title's logo, so there is one (see logoUrl) */
export const imageUrl = (image?: string | null): string | undefined => logoUrl(image);

/** The row's tooltip/keywords text: the excerpt cut to one line, "" when none */
export function oneLine(text?: string | null, max = 140): string {
    const t = String(text ?? "")
        .replace(/\s+/g, " ")
        .trim();
    return t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, "")}…` : t;
}

// ---- The unified search: software, tools, Q&A and articles in one list ----

export type SearchFilter = "all" | "software" | "tools" | "qa" | "articles";

/** Which sections a filter shows */
export const sectionsOf = (filter: SearchFilter) =>
    ({
        software: filter === "all" || filter === "software",
        tools: filter === "all" || filter === "tools",
        qa: filter === "all" || filter === "qa",
        articles: filter === "all" || filter === "articles",
    }) as const;

/** A row's id: the kind and the slug, so a tool and a title with the same slug are two rows */
export type SearchResults = {
    software: Software[];
    tools: ContentTool[];
    qa: ContentQuestion[];
    articles: ContentArticle[];
};
export type SearchDeps = {
    software: (q: string) => Promise<Software[]>;
    tools: (q: string) => Promise<ContentTool[]>;
    qa: (q: string) => Promise<ContentQuestion[]>;
    articles: (q: string) => Promise<ContentArticle[]>;
};

/** Answers kept for a minute per section and query, so retyping or switching back does not ask the API again */
export const SEARCH_TTL_MS = 60_000;

/**
 * One request per section asked for (All is 4). A section that fails is empty; the error is raised only when no section answered, from the cache or fresh.
 * `cache` holds answers by section and query for SEARCH_TTL_MS.
 */
export async function searchAllWith(
    q: string,
    filter: SearchFilter,
    deps: SearchDeps,
    cache: Map<string, { at: number; rows: unknown }> = new Map(),
    now: () => number = Date.now,
): Promise<SearchResults> {
    const on = sectionsOf(filter);
    const out: SearchResults = { software: [], tools: [], qa: [], articles: [] };
    const asked: Promise<unknown>[] = [];
    let cached = 0; // sections answered from the cache count as answered
    const run = <K extends keyof SearchResults>(key: K, enabled: boolean) => {
        if (!enabled) return;
        const id = `${key}|${q.toLowerCase()}`;
        const hit = cache.get(id);
        if (hit && now() - hit.at < SEARCH_TTL_MS) {
            out[key] = hit.rows as SearchResults[K];
            cached++;
            return;
        }
        asked.push(
            (deps[key](q) as Promise<SearchResults[K]>).then((rows) => {
                cache.set(id, { at: now(), rows });
                out[key] = rows;
            }),
        );
    };
    run("software", on.software);
    run("tools", on.tools);
    run("qa", on.qa);
    run("articles", on.articles);
    const settled = await Promise.allSettled(asked);
    const failed = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (cached === 0 && failed.length === settled.length && failed.length > 0) throw failed[0].reason;
    return out;
}

export const rowId = (kind: "software" | "tools" | "qa" | "articles", slug: string) => `${kind}:${slug}`;

/** The slug of a selected row of one kind, or null when another kind (or nothing) is selected */
export const slugOfRow = (id: string | null | undefined, kind: "software" | "tools" | "qa" | "articles") =>
    id && id.startsWith(`${kind}:`) ? id.slice(kind.length + 1) : null;

/** A tool's icon: the site's own PNG (icon_url, an https address), else its SVG as a data address, else its picture, else undefined (the hammer) */
export function toolIconUrl(tool: Pick<ContentTool, "icon_url" | "icon_svg" | "image">): string | undefined {
    if (tool.icon_url && /^https:\/\//.test(tool.icon_url)) return tool.icon_url;
    const svg = tool.icon_svg?.trim();
    if (svg && svg.startsWith("<svg")) return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return imageUrl(tool.image);
}

/** "Sep 21, 2026" from an ISO time, or "" */
export const isoDay = (value?: string | null) => day(value?.slice(0, 10));

/** A tool's detail body: its name, the picture when it has one, and the short description */
export function toolMarkdown(tool: ContentTool): string {
    const image = imageUrl(tool.image);
    return [`# ${escapeMd(tool.name)}`, image ? `![](${image})` : "", escapeMd(oneLine(tool.summary, 300))]
        .filter(Boolean)
        .join("\n\n");
}

/** A question's detail body: the title, its excerpt, and the accepted or top answer's excerpt when the API sent one */
export function questionMarkdown(q: ContentQuestion, full?: ContentQuestion): string {
    const answer = (full ?? q).answer;
    const parts = [`# ${escapeMd(q.title)}`, escapeMd(oneLine(q.excerpt, 400))];
    if (answer?.excerpt) {
        parts.push(
            `**${answer.accepted ? "Accepted answer" : "Top answer"}${answer.author ? ` · ${escapeMd(answer.author)}` : ""}**`,
            escapeMd(oneLine(answer.excerpt, 400)),
        );
    } else if (!q.answer_count) parts.push("_No answers yet._");
    return parts.filter(Boolean).join("\n\n");
}

/** An article's detail body: the featured image, the title and the excerpt */
export function articleMarkdown(a: ContentArticle): string {
    const image = imageUrl(a.image);
    return [image ? `![](${image})` : "", `# ${escapeMd(a.title)}`, escapeMd(oneLine(a.excerpt, 400))]
        .filter(Boolean)
        .join("\n\n");
}

/** "4 min read", or "" when the API did not send it (an older API) */
export const readingLabel = (minutes?: number | null) => (minutes && minutes > 0 ? `${minutes} min read` : "");
