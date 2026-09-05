/**
 * Tool layer for Calypso.
 *
 * Everything here runs against services on the home tailnet, addressed by MagicDNS
 * hostname rather than a raw 100.x IP — same constraint as the model endpoints:
 * `tailscale serve` issues certs for the hostname only, and hardcoded IPs rot.
 *
 * Every executor is total: it returns a string for the model no matter what happens.
 * A tool that throws would abort the agent loop mid-turn, whereas a tool that returns
 * "search failed: ..." lets the model recover or say so. Timeouts are per-tool because
 * a scrape is an order of magnitude slower than a search.
 */

export interface ToolContext {
  searxngUrl: string;
  ragUrl: string;
  ragApiKey: string;
  ragCollection: string;
  firecrawlUrl: string;
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** OpenAI-format schemas advertised to llama.cpp via `tools` (requires --jinja server-side). */
export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the live web via the self-hosted SearXNG instance. Use for current events, " +
        "documentation, prices, versions — anything you are not certain about or that may have " +
        "changed recently. Returns ranked titles, URLs and snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
          count: { type: "integer", description: "How many results to return (1-10, default 5)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rag_search",
      description:
        "Search the user's private knowledge base (their own notes, past research, verified " +
        "infrastructure configs, session history). Use this BEFORE web_search whenever the " +
        "question touches their own systems, projects, hardware, decisions or history.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to look for." },
          count: { type: "integer", description: "How many chunks to return (1-10, default 5)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "Fetch a single web page and return it as clean markdown. Use after web_search when a " +
        "snippet is not enough and you need the actual page contents.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Absolute http(s) URL to fetch." },
        },
        required: ["url"],
      },
    },
  },
];

function trimSlash(u: string): string {
  return (u || "").trim().replace(/\/+$/, "");
}

/** Bounded fetch — the agent loop must never hang on an unreachable tailnet service. */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function clampCount(n: unknown, fallback = 5): number {
  const v = typeof n === "number" ? n : Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(Math.max(Math.trunc(v), 1), 10);
}

async function webSearch(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const query = String(args.query ?? "").trim();
  if (!query) return "web_search error: empty query.";
  const n = clampCount(args.count);
  const url = `${trimSlash(ctx.searxngUrl)}/search?q=${encodeURIComponent(query)}&format=json`;
  try {
    const res = await fetchWithTimeout(url, {}, 20000);
    if (!res.ok) return `web_search failed: SearXNG returned HTTP ${res.status}.`;
    const json = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    const hits = (json.results ?? []).slice(0, n);
    if (hits.length === 0) return `web_search: no results for "${query}".`;
    return hits
      .map((r, i) => `[${i + 1}] ${r.title ?? "(untitled)"}\n${r.url ?? ""}\n${(r.content ?? "").trim()}`)
      .join("\n\n");
  } catch (e) {
    return `web_search failed: ${(e as Error).message}. Is SearXNG reachable on the tailnet?`;
  }
}

async function ragSearch(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const query = String(args.query ?? "").trim();
  if (!query) return "rag_search error: empty query.";
  if (!ctx.ragApiKey) return "rag_search unavailable: no RAG API key configured in extension preferences.";
  const n = clampCount(args.count);
  const body: Record<string, unknown> = { query, n, hybrid: true };
  // Empty collection means "search everything" — the API treats null as all indexes.
  if (ctx.ragCollection.trim()) body.collection = ctx.ragCollection.trim();
  try {
    const res = await fetchWithTimeout(
      `${trimSlash(ctx.ragUrl)}/v1/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ctx.ragApiKey },
        body: JSON.stringify(body),
      },
      25000,
    );
    if (res.status === 401 || res.status === 403) return "rag_search failed: API key rejected (rotate it).";
    if (!res.ok) return `rag_search failed: HTTP ${res.status}.`;
    const json = (await res.json()) as {
      results?: Array<{ collection?: string; content?: string; score?: number }>;
    };
    const hits = (json.results ?? []).slice(0, n);
    if (hits.length === 0) return `rag_search: nothing in the knowledge base matched "${query}".`;
    return hits
      .map((r, i) => {
        const head = `[${i + 1}] collection=${r.collection ?? "?"}${
          typeof r.score === "number" ? ` score=${r.score.toFixed(3)}` : ""
        }`;
        // Chunks can be very long; cap so a few hits cannot blow the context window.
        return `${head}\n${(r.content ?? "").trim().slice(0, 1200)}`;
      })
      .join("\n\n");
  } catch (e) {
    return `rag_search failed: ${(e as Error).message}.`;
  }
}

async function fetchUrl(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const url = String(args.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) return "fetch_url error: need an absolute http(s) URL.";
  try {
    const res = await fetchWithTimeout(
      `${trimSlash(ctx.firecrawlUrl)}/v1/scrape`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"] }),
      },
      // Scraping renders JS and is much slower than a search; give it real room.
      90000,
    );
    if (!res.ok) return `fetch_url failed: Firecrawl returned HTTP ${res.status}.`;
    const json = (await res.json()) as { data?: { markdown?: string }; markdown?: string };
    const md = (json.data?.markdown ?? json.markdown ?? "").trim();
    if (!md) return `fetch_url: ${url} returned no extractable text.`;
    return md.slice(0, 6000);
  } catch (e) {
    return `fetch_url failed: ${(e as Error).message}.`;
  }
}

const EXECUTORS: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>> = {
  web_search: webSearch,
  rag_search: ragSearch,
  fetch_url: fetchUrl,
};

/** Dispatch one tool call. Unknown names return a message rather than throwing. */
export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  const fn = EXECUTORS[name];
  if (!fn) return `Unknown tool "${name}".`;
  let args: Record<string, unknown> = {};
  if (rawArgs && rawArgs.trim()) {
    try {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch {
      // Models occasionally emit trailing commas or stray prose around the JSON.
      const m = rawArgs.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          args = JSON.parse(m[0]) as Record<string, unknown>;
        } catch {
          return `Could not parse arguments for ${name}: ${rawArgs.slice(0, 200)}`;
        }
      } else {
        return `Could not parse arguments for ${name}: ${rawArgs.slice(0, 200)}`;
      }
    }
  }
  return fn(args, ctx);
}

/** One-line summary for the UI, e.g. `web_search("qwen3.8 27b")`. */
export function describeCall(name: string, rawArgs: string): string {
  try {
    const a = JSON.parse(rawArgs || "{}") as Record<string, unknown>;
    const key = a.query ?? a.url ?? "";
    return key ? `${name}(${JSON.stringify(String(key).slice(0, 60))})` : name;
  } catch {
    return name;
  }
}
