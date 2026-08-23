import raw from "./emoji.json";
import { LIST_ICON_EMOJI_OPTIONS } from "../utils/formatting";

/**
 * The full Unicode emoji set with search keywords — 1,870 entries, ~100 KB.
 * Regenerate with `node tools/build-emoji-data.mjs`; see that file for the
 * source and why we don't depend on @emoji-mart/data (28 MB).
 */
export interface Emoji {
  char: string;
  name: string;
  keywords: string;
  /** Source order, used as a tie-break: emoji-mart lists 🐈 before 🐈‍⬛. */
  order: number;
}

let cached: Emoji[] | undefined;

/**
 * Built on first use, not at import.
 *
 * Three commands transitively import this module (lists, createList, and
 * createBookmark via its Create List action) but only reach the data if the
 * picker is actually opened. Doing the 1,870-entry transform at module scope
 * charged every one of those launches for a screen most of them never show.
 */
export function allEmoji(): Emoji[] {
  if (cached) return cached;

  const curatedKeywords = new Map(
    LIST_ICON_EMOJI_OPTIONS.filter((o) => o.keywords).map((o) => [o.value, o.keywords as string]),
  );

  cached = (raw as [string, string, string?][]).map(([char, name, keywords], order) => ({
    char,
    name,
    // Fold in our hand-written terms so "todo" still finds ✅ and "wip" finds 🚧
    // — those describe what a list icon is FOR, which no general set covers.
    keywords: [keywords, curatedKeywords.get(char)].filter(Boolean).join(" "),
    order,
  }));
  return cached;
}

/**
 * Cap on rendered results. Raycast renders every item it is handed, and a grid
 * of 1,870 is visibly slow to open; nobody scrolls past 200 emoji anyway.
 */
const MAX_RESULTS = 200;

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Best match for one search word: an exact name word, then an exact keyword,
 * then a prefix of either. Returns null when the word matches nothing.
 *
 * Matching is on whole WORDS, not substrings — a plain `name.includes(q)` put
 * 🇮🇩 Indonesia at the top of a search for "done".
 */
function rankToken(token: string, nameTokens: string[], keywordTokens: string[]) {
  let position: number;
  if ((position = nameTokens.indexOf(token)) >= 0) return { tier: 1, position };
  if ((position = keywordTokens.indexOf(token)) >= 0) return { tier: 2, position };
  if ((position = nameTokens.findIndex((t) => t.startsWith(token))) >= 0) return { tier: 3, position };
  if ((position = keywordTokens.findIndex((t) => t.startsWith(token))) >= 0) return { tier: 4, position };
  return null;
}

/**
 * Ranked search over names and keywords.
 *
 * EVERY word typed must match, so "read later" narrows to 👀 rather than
 * widening to everything matching "read". Within a tier, an earlier match
 * position wins — emoji-mart orders keywords by relevance, so "happy" being
 * the second keyword of 😀 beats it being the fifth of something else.
 */
export function searchEmoji(query: string): Emoji[] {
  const q = query.trim().toLowerCase();
  const queryTokens = tokenize(q);
  if (!queryTokens.length) return [];

  const matches: { emoji: Emoji; tier: number; position: number }[] = [];

  for (const emoji of allEmoji()) {
    const name = emoji.name.toLowerCase();
    const nameTokens = tokenize(name);
    const keywordTokens = tokenize(emoji.keywords);

    if (name === q) {
      matches.push({ emoji, tier: 0, position: 0 });
      continue;
    }

    // Rank by the STRONGEST word match, but only once every word has matched
    // something — otherwise a two-word query scores like its best single word.
    let tier = Number.MAX_SAFE_INTEGER;
    let position = Number.MAX_SAFE_INTEGER;
    let matchedEveryWord = true;

    for (const token of queryTokens) {
      const ranked = rankToken(token, nameTokens, keywordTokens);
      if (!ranked) {
        matchedEveryWord = false;
        break;
      }
      if (ranked.tier < tier || (ranked.tier === tier && ranked.position < position)) {
        tier = ranked.tier;
        position = ranked.position;
      }
    }

    if (matchedEveryWord) matches.push({ emoji, tier, position });
  }

  return matches
    .sort((a, b) => a.tier - b.tier || a.position - b.position || a.emoji.order - b.emoji.order)
    .slice(0, MAX_RESULTS)
    .map((match) => match.emoji);
}
