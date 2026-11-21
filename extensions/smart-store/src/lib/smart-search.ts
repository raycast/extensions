import { useEffect, useState } from "react";
import { z } from "zod";
import { askJSON, getAIStatus } from "./ai";
import { StoreExtension } from "./catalog";
import { languageName } from "./language";
import { keywordSearch } from "./search";
import { queryToEnglish } from "./translate";

export type Verdict = "found" | "partial" | "none";

export interface SmartResult {
  item: StoreExtension;
  /** Why the AI picked this extension, in the user's language. */
  reason?: string;
}

export interface SmartSearchState {
  results: SmartResult[];
  verdict?: Verdict;
  /** True when results were ranked by AI rather than by keywords only. */
  isSmart: boolean;
  isLoading: boolean;
  error?: Error;
}

const ExpansionSchema = z.object({
  englishQuery: z.string(),
  keywords: z.array(z.string()),
});

const RankingSchema = z.object({
  verdict: z.enum(["found", "partial", "none"]),
  matches: z.array(z.object({ ref: z.string(), reason: z.string() })),
});

const CANDIDATES = 40;
type Remembered = { results: SmartResult[]; verdict?: Verdict; isSmart: boolean };
/** Results remembered per catalog, so a catalog refresh starts from a clean slate. */
const memories = new WeakMap<StoreExtension[], Map<string, Remembered>>();

function memoryFor(items: StoreExtension[]): Map<string, Remembered> {
  let memory = memories.get(items);
  if (!memory) {
    memory = new Map();
    memories.set(items, memory);
  }
  return memory;
}

function describeCandidate(ref: string, item: StoreExtension) {
  const commands = item.commands
    .map((c) => c.title)
    .slice(0, 8)
    .join("; ");
  return `${ref} | ${item.title} | ${item.description} | commands: ${commands}`;
}

async function runSmartSearch(query: string, items: StoreExtension[], lang: string, signal: AbortSignal) {
  const expansion = await askJSON(
    `A user is looking for a Raycast extension (a macOS launcher plugin). Their request, possibly not in English:
"${query}"

1. Rewrite the request as a short English query ("englishQuery").
2. List 8 to 15 English search keywords an extension solving it would likely use in its title, description or command names: synonyms, related app names, technical terms (e.g. for "apps that start when I log in": login items, launch at login, startup, launch agents).`,
    ExpansionSchema,
    signal,
  );

  const candidates = keywordSearch(items, [expansion.englishQuery, ...expansion.keywords, query], CANDIDATES);
  if (!candidates.length) return { results: [], verdict: "none" as Verdict, isSmart: true };

  const refs = new Map(candidates.map((c, i) => [`e${i + 1}`, c.item]));
  const ranking = await askJSON(
    `A user is looking for a Raycast extension. Their request: "${query}" (in English: "${expansion.englishQuery}").

Candidate extensions (ref | title | description | commands):
${[...refs].map(([ref, item]) => describeCandidate(ref, item)).join("\n")}

Pick the candidates that genuinely help with the request, best first (at most 10). For each, give a one-sentence reason written in ${languageName(lang)}.
Set "verdict" to "found" if at least one candidate does what the user asked, "partial" if candidates only cover part of it, "none" if no candidate fits.`,
    RankingSchema,
    signal,
  );

  const results: SmartResult[] = ranking.matches.flatMap((match) => {
    const item = refs.get(match.ref);
    return item ? [{ item, reason: match.reason }] : [];
  });
  return { results, verdict: ranking.verdict, isSmart: true };
}

async function runKeywordSearch(query: string, items: StoreExtension[], lang: string, signal: AbortSignal) {
  const english = await queryToEnglish(query, lang, signal);
  const terms = english === query ? [query] : [english, query];
  const results = keywordSearch(items, terms, 50).map((r) => ({ item: r.item }));
  return { results, verdict: undefined, isSmart: false };
}

/** Debounced search: understands plain-language requests with AI, keywords otherwise. */
export function useSmartSearch(query: string, items: StoreExtension[], lang: string): SmartSearchState {
  // `query` records which search the state belongs to, so results of a previous query never show for a new one.
  const [state, setState] = useState<SmartSearchState & { query?: string }>({
    results: [],
    isSmart: false,
    isLoading: false,
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !items.length) {
      setState({ results: [], isSmart: false, isLoading: false, query: trimmed });
      return;
    }
    const ai = getAIStatus();
    const key = `${ai.available ? ai.provider : "keywords"}:${lang}:${trimmed.toLowerCase()}`;
    const memory = memoryFor(items);
    const remembered = memory.get(key);
    if (remembered) {
      setState({ ...remembered, isLoading: false, query: trimmed });
      return;
    }

    const controller = new AbortController();
    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));
    const timer = setTimeout(
      async () => {
        try {
          const result = ai.available
            ? await runSmartSearch(trimmed, items, lang, controller.signal)
            : await runKeywordSearch(trimmed, items, lang, controller.signal);
          if (controller.signal.aborted) return;
          memory.set(key, result);
          setState({ ...result, isLoading: false, query: trimmed });
        } catch (error) {
          if (controller.signal.aborted) return;
          // Same fallback as without AI, including translating the query into English.
          const fallback = await runKeywordSearch(trimmed, items, lang, controller.signal);
          if (controller.signal.aborted) return;
          setState({
            ...fallback,
            isLoading: false,
            query: trimmed,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
      ai.available ? 700 : 300,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, items, lang]);

  const trimmed = query.trim();
  if (trimmed && state.query !== trimmed) return { results: [], isSmart: false, isLoading: true };
  return state;
}
