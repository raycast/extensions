import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  serperApiKey?: string;
};

type SerperResult = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
};

/**
 * Perform a web search using the Serper API and return a compact JSON array of results
 * with fields: title, link, snippet, source.
 */
export default async function search(query: string): Promise<string> {
  const { serperApiKey } = getPreferenceValues<Preferences>();
  if (!serperApiKey) {
    // Return empty result set when key is missing; caller treats as no web context
    return JSON.stringify([]);
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 8 }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Common case: 402 (insufficient credits) or 401 (invalid key)
    if (response.status === 402) {
      throw new Error("Serper: insufficient credits. Check your balance on serper.dev → Billing.");
    }
    if (response.status === 401) {
      throw new Error("Serper: invalid API key. Update the key in extension preferences.");
    }
    throw new Error(`Serper error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    searchParameters?: unknown;
    organic?: Array<SerperResult & { date?: string }>;
    answerBox?: unknown;
    knowledgeGraph?: unknown;
  };

  const simplified: SerperResult[] = (data.organic ?? [])
    .filter((r) => Boolean(r.link))
    .map((r) => ({
      title: r.title ?? "",
      link: r.link ?? "",
      snippet: r.snippet ?? "",
      source: r.source ?? "web",
    }));

  return JSON.stringify(simplified);
}
