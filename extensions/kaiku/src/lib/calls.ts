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

export type CallResults = { calls: Call[]; snippets: Record<string, string> };

/** Calls whose title, tags or source match the text, plus calls whose transcript does. */
export async function searchCalls(query: string): Promise<CallResults> {
  const text = query.trim();
  if (!text) {
    const [list] = await callTools([{ name: "list_calls", arguments: { limit: 100 } }]);
    return { calls: (JSON.parse(list) as CallPage).calls, snippets: {} };
  }
  const [byName, byText, all] = await callTools([
    { name: "list_calls", arguments: { query: text, limit: 100 } },
    { name: "search_transcripts", arguments: { query: text, limit: 100 } },
    { name: "list_calls", arguments: { limit: 500 } },
  ]);
  const named = (JSON.parse(byName) as CallPage).calls;
  const matches = (JSON.parse(byText) as SearchResult).matches;
  const snippets: Record<string, string> = {};
  for (const m of matches) snippets[m.id] ??= `[${m.time}] ${m.speaker}: ${m.snippet}`;

  const known = new Map((JSON.parse(all) as CallPage).calls.map((c) => [c.id, c]));
  const calls = [...named];
  const seen = new Set(named.map((c) => c.id));
  for (const id of Object.keys(snippets)) {
    const call = known.get(id);
    if (call && !seen.has(id)) {
      seen.add(id);
      calls.push(call);
    }
  }
  calls.sort((a, b) => b.date.localeCompare(a.date));
  return { calls, snippets };
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

export async function readTranscript(id: string, limit = 400000): Promise<string> {
  const [text] = await callTools([{ name: "read_transcript", arguments: { id, unit: "characters", limit } }]);
  return body(text);
}
