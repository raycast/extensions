export const WEBSITE_URL = "https://lab.magiconch.com/nbnhhsh/";
const API_URL = "https://lab.magiconch.com/api/nbnhhsh/guess";
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 50;
const REQUEST_TIMEOUT = 10_000;

export type MeaningGroup = {
  name: string;
  meanings: string[];
  kind: "dictionary" | "suggestion" | "none";
};

/** Match the upstream token syntax, then normalize duplicate/case variants. */
export function normalizeQuery(text: string): string {
  return [...new Set((text.match(/[a-z0-9]{2,}/gi) ?? []).map((token) => token.toLowerCase()))].join(",");
}

export function websiteUrl(query: string): string {
  const tokens = normalizeQuery(query);
  return tokens ? `${WEBSITE_URL}#/text/${encodeURIComponent(tokens)}` : WEBSITE_URL;
}

function invalidResponse(): Error {
  return new Error("nbnhhsh returned an unexpected response. Try again or open the website.");
}

function readMeanings(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw invalidResponse();
  }
  return [...new Set(value.filter((item) => item.trim().length > 0))];
}

export function parseResponse(value: unknown, query: string): MeaningGroup[] {
  if (!Array.isArray(value)) throw invalidResponse();
  const names = normalizeQuery(query).split(",").filter(Boolean);
  const groups = new Map<string, MeaningGroup>();

  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.name !== "string") throw invalidResponse();
    const name = item.name.toLowerCase();
    if (!names.includes(name) || groups.has(name)) throw invalidResponse();

    let meanings: string[];
    let kind: MeaningGroup["kind"];
    if (item.trans === null) {
      meanings = [];
      kind = "none";
    } else if (item.trans !== undefined) {
      meanings = readMeanings(item.trans);
      kind = meanings.length ? "dictionary" : "none";
    } else {
      meanings = item.inputting === null ? [] : readMeanings(item.inputting);
      kind = meanings.length ? "suggestion" : "none";
    }
    groups.set(name, { name, meanings, kind });
  }

  // Keep the user's input order, including explicit rows for missing terms.
  return names.map((name) => groups.get(name) ?? { name, meanings: [], kind: "none" });
}

export function createLookupClient(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expires: number; groups: MeaningGroup[] }>();

  return {
    invalidate(input: string) {
      cache.delete(normalizeQuery(input));
    },
    async lookup(input: string, signal: AbortSignal): Promise<MeaningGroup[]> {
      signal.throwIfAborted();
      const query = normalizeQuery(input);
      if (!query) return [];
      const cached = cache.get(query);
      if (cached && cached.expires > now()) return cached.groups;
      cache.delete(query);

      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]);
      try {
        const response = await fetcher(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ text: query }),
          signal: requestSignal,
        });
        if (response.status === 429) throw new Error("Too many requests. Wait a moment, then retry.");
        if (!response.ok) throw new Error(`nbnhhsh is unavailable (HTTP ${response.status}). Try again shortly.`);

        let value: unknown;
        try {
          value = await response.json();
        } catch {
          throw invalidResponse();
        }
        const groups = parseResponse(value, query);
        requestSignal.throwIfAborted();
        if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
        cache.set(query, { groups, expires: now() + CACHE_TTL });
        return groups;
      } catch (error) {
        signal.throwIfAborted();
        if (requestSignal.aborted) throw new Error("The lookup timed out. Check your connection and retry.");
        if (error instanceof TypeError) throw new Error("Could not reach nbnhhsh. Check your connection and retry.");
        throw error;
      }
    },
  };
}
