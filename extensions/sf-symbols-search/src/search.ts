import { AI, Cache, environment } from "@raycast/api";
import { searchCLI, SFSymbolsApp } from "./sfsymbols-cli";
import { CatalogIndex, sfsymbol } from "./types";

function nameComponents(name: string): string[] {
  return name.split(".");
}

/**
 * The fallback matcher for the bundled snapshot, where Apple's CLI matcher is not available.
 * Every query word must appear in the name or a tag. Exact names rank first, then names that
 * start with the query, then everything else in catalog order.
 */
function searchInMemory(catalog: CatalogIndex, query: string): sfsymbol[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const glyphMatch = catalog.symbols.filter((symbol) => symbol.symbol && symbol.symbol === query.trim());
  if (glyphMatch.length > 0) return glyphMatch;

  const words = needle.split(/\s+/).filter(Boolean);
  const scored: { symbol: sfsymbol; score: number; order: number }[] = [];
  catalog.symbols.forEach((symbol, order) => {
    const name = symbol.name.toLowerCase();
    const haystack = [name, ...symbol.searchTerms.map((term) => term.toLowerCase())];
    if (!words.every((word) => haystack.some((field) => field.includes(word)))) return;
    const score = name === needle ? 0 : name.startsWith(needle) ? 1 : nameComponents(name).includes(words[0]) ? 2 : 3;
    scored.push({ symbol, score, order });
  });
  return scored.sort((a, b) => a.score - b.score || a.order - b.order).map(({ symbol }) => symbol);
}

/**
 * Symbols matching a query, best first. With the app installed this is Apple's matcher
 * (names, aliases, tags, word forms, glyphs and code points); otherwise the bundled matcher.
 */
export async function searchSymbols(
  catalog: CatalogIndex,
  app: SFSymbolsApp | null,
  query: string,
): Promise<sfsymbol[]> {
  if (!query.trim()) return [];
  if (app && catalog.source === "app") {
    const names = await searchCLI(app, query);
    return names.map((name) => catalog.byName.get(name)).filter((symbol): symbol is sfsymbol => symbol !== undefined);
  }
  return searchInMemory(catalog, query);
}

/**
 * Symbols matching any of the given keywords, ordered by keyword (the AI lists the most
 * relevant first) and then by catalog order. A keyword matches a whole name, a whole name
 * component (`pencil` matches `pencil.tip` but `pen` does not), or a whole tag, so a short
 * keyword does not drag in every name that happens to contain it.
 */
export function symbolsForKeywords(catalog: CatalogIndex, keywords: readonly string[]): sfsymbol[] {
  const seen = new Set<string>();
  const results: sfsymbol[] = [];
  for (const keyword of keywords) {
    for (const symbol of catalog.symbols) {
      if (seen.has(symbol.name)) continue;
      const matches =
        symbol.name === keyword ||
        nameComponents(symbol.name).includes(keyword) ||
        symbol.searchTerms.some((term) => term.toLowerCase() === keyword);
      if (matches) {
        seen.add(symbol.name);
        results.push(symbol);
      }
    }
  }
  return results;
}

/** Whether AI suggestions can run at all for this user. */
export function canUseAI(): boolean {
  try {
    return environment.canAccess(AI);
  } catch {
    return false;
  }
}

const aiCache = new Cache({ namespace: "ai-keywords" });

const MAX_KEYWORDS = 12;

/** Turns a free-form AI reply into clean lowercase keywords, dropping anything that isn't one. */
export function parseKeywords(reply: string): string[] {
  const keywords = reply
    .split(/[,\n]/)
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/^[-*•\d.)\s]+/, "")
        .replace(/["'`]/g, "")
        .trim(),
    )
    .filter((part) => /^[a-z0-9]+(\.[a-z0-9]+)*$/.test(part));
  return [...new Set(keywords)].slice(0, MAX_KEYWORDS);
}

/**
 * Asks Raycast AI to translate a description ("write with pen") into the words SF Symbols
 * names and tags actually use. The AI only proposes words; which symbols exist is decided
 * by matching those words against the catalog, so it cannot invent a symbol name.
 *
 * Replies are cached per query, so repeating a search costs no AI request.
 */
export async function suggestKeywords(query: string, signal?: AbortSignal): Promise<string[]> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = aiCache.get(normalized);
  if (cached) return JSON.parse(cached) as string[];

  const prompt = [
    "You help people find Apple SF Symbols, the icon set used across Apple platforms.",
    `Someone searching the catalog typed: "${normalized}"`,
    `List up to ${MAX_KEYWORDS} keywords likely to appear in the names or tags of the symbols they want:`,
    "synonyms, the concrete objects that would depict the idea, and SF Symbol name fragments",
    'such as "pencil", "trash", "arrow", "bubble", "person", "gearshape" or "square.and.arrow.up".',
    "Use single lowercase words or dotted name fragments. Most relevant first.",
    "If the text is not a word, a name or a description of anything (random letters, keyboard mashing),",
    "reply with exactly NONE.",
    "Otherwise reply with only the keywords, comma-separated, and nothing else.",
  ].join("\n");

  const reply = await AI.ask(prompt, { creativity: "low", signal });
  // NONE means the text names nothing. It isn't cached: a wrong NONE shouldn't stick.
  if (/^\s*none\W*$/i.test(reply)) return [];
  const keywords = parseKeywords(reply);
  if (keywords.length > 0) aiCache.set(normalized, JSON.stringify(keywords));
  return keywords;
}
