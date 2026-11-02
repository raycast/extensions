import { callTools } from "./kaiku";

export type Call = {
  id: string;
  title: string;
  date: string;
  duration: string;
  tags: string[];
  source?: string;
  status: string;
  hasTranscript: boolean;
  hasSummary: boolean;
  folder: string;
};

type CallPage = { total: number; calls: Call[] };
type SearchResult = { matches: { id: string; snippet: string; speaker: string; time: string }[] };

export type CallResults = { calls: Call[]; snippets: Record<string, string>; truncated: boolean };

const LIMIT = 100;

/** Calls whose title, tags or source match the text, plus calls whose transcript does. */
export async function searchCalls(query: string): Promise<CallResults> {
  const text = query.trim();
  if (!text) {
    const [list] = await callTools([{ name: "list_calls", arguments: { limit: LIMIT } }]);
    const page = JSON.parse(list) as CallPage;
    return { calls: page.calls, snippets: {}, truncated: page.total > page.calls.length };
  }
  const [byName, byText] = await callTools([
    { name: "list_calls", arguments: { query: text, limit: LIMIT } },
    { name: "search_transcripts", arguments: { query: text, limit: LIMIT } },
  ]);
  const namedPage = JSON.parse(byName) as CallPage;
  const named = namedPage.calls;
  const matches = (JSON.parse(byText) as SearchResult).matches;
  const snippets: Record<string, string> = {};
  for (const m of matches) snippets[m.id] ??= `[${m.time}] ${m.speaker}: ${m.snippet}`;

  const calls = [...named];
  const seen = new Set(named.map((c) => c.id));
  const missing = Object.keys(snippets).filter((id) => !seen.has(id));
  const known = missing.length > 0 ? await allCalls() : new Map<string, Call>();
  for (const id of missing) {
    const call = known.get(id);
    if (call && !seen.has(id)) {
      seen.add(id);
      calls.push(call);
    }
  }
  calls.sort((a, b) => b.date.localeCompare(a.date));
  const truncated = namedPage.total > named.length || matches.length >= LIMIT;
  return { calls, snippets, truncated };
}

/** Every call, page by page, so transcript matches on older calls are found too. */
async function allCalls(): Promise<Map<string, Call>> {
  const known = new Map<string, Call>();
  for (let offset = 0; ;) {
    const [page] = await callTools([{ name: "list_calls", arguments: { limit: 500, offset } }]);
    const { total, calls } = JSON.parse(page) as CallPage;
    for (const c of calls) known.set(c.id, c);
    offset += calls.length;
    if (calls.length === 0 || offset >= total) return known;
  }
}

/** The body of a tool reply, after the header lines that precede the first blank line. */
function body(text: string): string {
  const i = text.indexOf("\n\n");
  return i >= 0 ? text.slice(i + 2) : text;
}

export async function readSummary(id: string): Promise<string> {
  const [text] = await callTools([{ name: "read_summary", arguments: { id } }]);
  return body(text);
}

/** The whole transcript, fetched in pages of up to 400000 characters. */
export async function readTranscript(id: string, limit = 400000, whole = true): Promise<string> {
  let out = "";
  let offset = 0;
  for (;;) {
    const [text] = await callTools([{ name: "read_transcript", arguments: { id, unit: "characters", limit, offset } }]);
    out += body(text);
    const next = text.slice(0, Math.max(text.indexOf("\n\n"), 0)).match(/More: offset (\d+)/);
    if (!whole || !next || Number(next[1]) <= offset) return out;
    offset = Number(next[1]);
  }
}
