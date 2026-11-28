import { getPreferenceValues } from "@raycast/api";
import {
    ArticleFilter,
    BUSY_MESSAGE,
    ContentArticle,
    ContentQuestion,
    ContentTool,
    Detail,
    Software,
    Update,
    VersionDetail,
    articlesPath,
    loadDetail as loadDetailWith,
    loadTrust as loadTrustWith,
    retryAfterMs,
    searchAllWith,
    SearchDeps,
    SearchFilter,
    SearchResults,
    questionsPath,
    toolsPath,
} from "./logic";

export * from "./logic";

const API = "https://fileion.com/api/v1";

/** The API answered 429 twice (after one quiet retry): the free limit, shown with a key link and the settings (error-view.tsx) */
export class BusyError extends Error {
    constructor() {
        super(BUSY_MESSAGE);
    }
}

export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
    const { apiKey } = getPreferenceValues<Preferences>();
    // A request that never answers must end (a row must not stay "…" forever): 15 seconds, or the caller's own signal
    const timeout = AbortSignal.timeout(15000);
    const ask = () =>
        fetch(`${API}${path}`, {
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
            headers: { Accept: "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        });
    let response = await ask();
    if (response.status === 429) {
        // Quietly wait for what the API asked (a few seconds at most) and try once more, then say it is busy
        await new Promise((r) => setTimeout(r, retryAfterMs(response.headers.get("Retry-After"))));
        response = await ask();
    }
    if (response.status === 429) throw new BusyError();
    if (!response.ok) throw new Error(`Fileion answered HTTP ${response.status}`);
    return ((await response.json()) as { data: T }).data;
}

export const searchSoftware = (q: string, signal?: AbortSignal) =>
    api<Software[]>(`/software?q=${encodeURIComponent(q)}&per_page=25`, signal);

export const getSoftware = (slug: string, signal?: AbortSignal) =>
    api<Software>(`/software/${encodeURIComponent(slug)}`, signal);

export const getVersion = (id: number, signal?: AbortSignal) => api<VersionDetail>(`/versions/${id}`, signal);

export const getUpdates = (signal?: AbortSignal) => api<Update[]>("/updates?per_page=40", signal);

const detailDeps = { getSoftware: (s: string) => getSoftware(s), getVersion: (id: number) => getVersion(id) };

/** The title's versions (1 request); its trust line is a second one, asked for only on the selected row (loadTrust) */
export const loadDetail = (slug: string, withTrust = false): Promise<Detail> =>
    loadDetailWith(slug, detailDeps, withTrust);

export const loadTrust = (detail: Detail) => loadTrustWith(detail, detailDeps);

const answers = new Map<string, { at: number; rows: unknown }>();
const searchDeps: SearchDeps = {
    software: (q) => searchSoftware(q),
    tools: (q) => getTools(q),
    qa: (q) => getQuestions(q),
    articles: (q) => getArticles(q, "all"),
};

export const searchAll = (q: string, filter: SearchFilter): Promise<SearchResults> =>
    searchAllWith(q, filter, searchDeps, answers);

export const getTools = (q: string, signal?: AbortSignal, sort?: "recent") =>
    api<ContentTool[]>(toolsPath(q, sort), signal);

export const getQuestions = (q: string, signal?: AbortSignal) => api<ContentQuestion[]>(questionsPath(q), signal);

export const getArticles = (q: string, type: ArticleFilter, signal?: AbortSignal) =>
    api<ContentArticle[]>(articlesPath(q, type), signal);

const questions = new Map<string, ContentQuestion>();

/** One answer per question for the life of the command (selecting a row again is free) */
export async function getQuestion(slug: string, signal?: AbortSignal): Promise<ContentQuestion> {
    const known = questions.get(slug);
    if (known) return known;
    const q = await api<ContentQuestion>(`/questions/${encodeURIComponent(slug)}`, signal);
    questions.set(slug, q);
    return q;
}
