// A copy of the title matcher in NodebookMD (`src/lib/search.ts`), so a query
// ranks here as it ranks in the app. Change both together.
import type { Hit } from "./types";

const SUPERSEDED = /-$/;

/**
 * What kind of page this is, from 0 to 1.
 *
 * Someone searching "copy points" wants the NODE. An example is a file that
 * uses it and a shelf entry is a button that runs it; both are worth showing,
 * below the thing itself. An index page lists pages and is almost never the
 * page the reader meant.
 */
export function weight(hit: Hit): number {
  const path = hit.path;
  if (path.startsWith("examples/") || path.includes("/examples/")) return 0.55;
  if (path.endsWith("/index") || path === "index") return 0.6;
  if (path.startsWith("shelf/")) return 0.7;
  if (SUPERSEDED.test(path)) return 0.8;
  // Every node context is a reference page, but a name shared between contexts
  // ("Attribute Wrangle" is a SOP, a LOP and a COP) has to break the tie
  // somehow, and SOPs are what most readers are in.
  if (path.startsWith("nodes/sop/")) return 1;
  if (/^(nodes|vex|expressions|hscript|hom)\//.test(path)) return 0.97;
  return 0.9;
}

/**
 * One page, with everything the matcher needs already worked out.
 *
 * This exists for one reason: the matcher runs over every page in the build on
 * every keystroke. Lower-casing the path and the title there cost 29ms for a
 * single letter — a keystroke that misses two frames before the letter itself
 * appears. None of it depends on what was typed, so none of it belongs in the
 * loop. See spec: Local — Performance Harness and Budgets.
 */
interface Ready {
  hit: Hit;
  path: string;
  title: string;
  /** The last part of the path, which is the page's own name. */
  leaf: string;
  /** The title with its spaces taken out, to compare against a slug. */
  packed: string;
  /** `title path`, for the words-in-any-order tier. */
  text: string;
  weight: number;
  rank: number;
  /** The folded title and leaf, for the abbreviation pass. Worked out on
   *  first use and only for the families that pass can match. */
  fold: { title: Folded; leaf: Folded } | null;
  folded: boolean;
}

/**
 * The prepared list for a title list, kept for as long as the list itself is.
 *
 * Weak, so dropping the titles drops this with them: `forgetTitles` is what
 * runs when the background pass adds pages, and a prepared list that outlived
 * its pages would answer with pages that no longer exist.
 */
const prepared = new WeakMap<Hit[], Ready[]>();

function ready(hits: Hit[]): Ready[] {
  let rows = prepared.get(hits);
  if (rows) return rows;
  rows = hits.map((hit) => {
    const path = hit.path.toLowerCase();
    const title = hit.title.toLowerCase();
    return {
      hit,
      path,
      title,
      leaf: path.slice(path.lastIndexOf("/") + 1),
      packed: title.replace(/\s+/g, ""),
      text: `${title} ${path}`,
      weight: weight(hit),
      rank: rank(hit),
      fold: null,
      folded: false,
    };
  });
  prepared.set(hits, rows);
  return rows;
}

/** How well a title or path answers what was typed. 0 means it does not.
 *
 *  The ladder is the order a reader means things: the path they typed, the
 *  name they typed, then the same as a beginning, then the same anywhere.
 *
 *  `tight` is the query with its spaces taken out, worked out once by the
 *  caller: someone typing "copy to points" is naming `copytopoints` exactly,
 *  and comparing as written left that page at the substring tier under the LOP
 *  of the same title. */
function score(row: Ready, query: string, tight: string, words: string[]): number {
  if (row.path === query) return 1000;
  if (row.leaf === tight || row.packed === tight) return 900;
  if (row.leaf.startsWith(tight) || row.packed.startsWith(tight)) return 700;
  if (row.path.startsWith(query)) return 600;
  if (row.title.includes(query)) return 400;
  if (row.path.includes(query)) return 300;

  // Words in any order: "points copy" still finds Copy to Points.
  return words.length > 1 && words.every((word) => row.text.includes(word)) ? 200 : 0;
}

/** The reader is looking for a node far more often than a shelf tool, and for
 *  a page far more often than the index that lists it. */
function rank(hit: Hit): number {
  const section = hit.path.split("/")[0];
  const depth = hit.path.endsWith("/index") ? 1 : 0;
  const order = ["nodes", "vex", "hom", "expressions", "props"].indexOf(section);
  return (order === -1 ? 9 : order) + depth * 10;
}

/** Below this, an abbreviation matches so much of the corpus it means nothing. */
const MIN_ABBREVIATION = 3;

/**
 * At and above this score the query NAMED the page — it is the path, the title,
 * or the beginning of one. Below it the letters merely appear somewhere, which
 * is a far weaker reading than an abbreviation of the same letters.
 */
const NAMED = 600;

/** The fast pick, straight out of the in-memory list. */
export function match(hits: Hit[], query: string, limit = 8): Hit[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [];
  const rows = ready(hits);
  const tight = wanted.replace(/\s+/g, "");
  const words = wanted.split(/\s+/).filter(Boolean);

  // Scored once and the score KEPT. The abbreviation gate below asks which
  // hits named the page, and asking that by scoring the list a second time
  // doubled the cost of every keystroke.
  const hit: Array<{ row: Ready; score: number }> = [];
  let named = 0;
  for (const row of rows) {
    const value = score(row, wanted, tight, words);
    if (value === 0) continue;
    if (value >= NAMED) named++;
    hit.push({ row, score: value });
  }
  hit.sort(
    // Weight breaks a tie the text cannot: "Copy to Points" is the exact title
    // of a SOP and of a LOP, and both are the same length, so without this the
    // answer is whichever the corpus happened to list first.
    (first, second) =>
      second.score - first.score ||
      second.row.weight - first.row.weight ||
      first.row.rank - second.row.rank ||
      first.row.path.length - second.row.path.length,
  );
  const scored = hit.map((row) => row.row.hit);

  // Letter-mashing, the way Houdini's TAB menu takes it: `cptp` for Copy to
  // Points. It runs when nothing NAMED the page, and ahead of the body search,
  // because the abbreviation is the stronger reading of a query with no spaces.
  //
  // "Nothing named it" is not "nothing matched at all". `adpr` is a substring
  // of `hom/hou/loadPreferences` — lo**adpr**eferences — so a pass gated on an
  // empty list never runs, and the reader keeps a Python method instead of
  // Adaptive Prune. The weak hits still follow, under the abbreviations.
  if (named === 0 && !/\s/.test(wanted) && wanted.length >= MIN_ABBREVIATION) {
    const guessed = abbreviated(rows, wanted, limit);
    const seen = new Set(guessed.map((hit) => hit.path));
    return [...guessed, ...scored.filter((hit) => !seen.has(hit.path))].slice(0, limit);
  }
  return scored.slice(0, limit);
}

/**
 * Page families the abbreviation pass is allowed to match.
 *
 * Someone mashing letters is reaching for a thing with a name — a node, a VEX
 * function, an HScript command. Over 11,000 pages, four letters in order match
 * almost anything: `atwr` alone hits `hapi.createWorkItem` and a destruction
 * tutorial before it reaches Attribute Wrangle. Houdini's own TAB menu only
 * ever searches nodes, which is why the matcher behaves there; the families
 * here are that same idea, widened to the scripting references.
 */
const ABBREVIATION_FAMILY = /^(nodes|vex|expressions|hscript|hom)\//;

/**
 * `cptp` should find "Copy to Points" the way it does in Houdini's own TAB
 * menu — letters in order, gaps allowed.
 *
 * Weight multiplies the score rather than breaking ties. As a tiebreak it would
 * never fire: two float scores are almost never exactly equal, so a superseded
 * page would outrank the current one whenever it matched a hair tighter.
 */
function abbreviated(rows: Ready[], query: string, limit: number): Hit[] {
  const scored: Array<{ hit: Hit; score: number }> = [];
  for (const row of rows) {
    if (!row.folded) {
      row.folded = true;
      // The trailing version goes: nobody abbreviates the "2.0" in "Copy to
      // Points 2.0", and counting it as name length lost that SOP to the LOP
      // of the same name, whose title carries no version at all.
      row.fold =
        ABBREVIATION_FAMILY.test(row.hit.path) && !row.hit.path.endsWith("/index")
          ? {
              title: fold(row.hit.title.replace(/\s+\d+(\.\d+)*$/, "")),
              leaf: fold(row.hit.path.slice(row.hit.path.lastIndexOf("/") + 1)),
            }
          : null;
    }
    if (!row.fold) continue;
    const title = subsequence(query, row.fold.title);
    const leaf = subsequence(query, row.fold.leaf);
    if (title === null && leaf === null) continue;
    scored.push({ hit: row.hit, score: Math.max(title ?? 0, leaf ?? 0) * row.weight });
  }
  return scored
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map((row) => row.hit);
}

/**
 * A name reduced to its letters and digits, remembering which of them start a
 * word. "Copy to Points 2.0" folds to `copytopoints20` with `C`, `t`, `P` and
 * `2` flagged; `createWorkitem` folds to itself with `c` and `W` flagged.
 *
 * Word starts are the whole point of the fold. They are what tells an
 * abbreviation apart from an accident — see `subsequence`.
 */
/** A name reduced to its letters, and which of them start a word. */
interface Folded {
  chars: string;
  starts: boolean[];
}

function fold(text: string): Folded {
  let chars = "";
  const starts: boolean[] = [];
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (!/[a-zA-Z0-9]/.test(character)) continue;
    const previous = i > 0 ? text[i - 1] : "";
    starts.push(
      chars.length === 0 ||
        !/[a-zA-Z0-9]/.test(previous) ||
        (character >= "A" && character <= "Z" && previous === previous.toLowerCase()),
    );
    chars += character.toLowerCase();
  }
  return { chars, starts };
}

/**
 * How well `query` abbreviates `name`, from 0 to 1, or `null` for no match.
 *
 * Three rules, and the first is the one that matters. The match must BEGIN at a
 * word start. People abbreviate from the fronts of words — `adpr` is
 * **Ad**aptive **Pr**une — so a run that begins mid-word is a coincidence, not
 * an abbreviation. Without this rule `adpr` returns "Delayed Load Procedural",
 * because lo**adpr**ocedural holds the letters with no gaps at all and so beats
 * the page the reader meant on every other measure.
 *
 * The rest orders what survives. Density (`query / span`) rewards a tight run;
 * coverage (`query / name`) rewards the query accounting for most of the name,
 * which is what separates `copytopoints` from
 * `geoutils::copytopointstargetattribs` when `cptp` spans 7 characters in both.
 * The word-start share then lifts a true abbreviation over a tighter accident.
 *
 * Every window is scored, not just the shortest, because the shortest window
 * and the best-aligned one are often not the same.
 */
function subsequence(query: string, name: Folded): number | null {
  const { chars, starts } = name;
  if (chars.length < query.length) return null;
  let best: number | null = null;

  for (let from = 0; from < chars.length;) {
    let qi = 0;
    let end = from;
    for (; end < chars.length && qi < query.length; end++) {
      if (chars[end] === query[qi]) qi++;
    }
    if (qi < query.length) break; // no complete match remains
    end--;

    // Pull the start inward to the tightest window with this end.
    let qk = query.length - 1;
    let start = end;
    for (; start >= 0 && qk >= 0; start--) {
      if (chars[start] === query[qk]) qk--;
    }
    start++;

    if (starts[start]) {
      let onStart = 0;
      let qj = 0;
      for (let i = start; i <= end && qj < query.length; i++) {
        if (chars[i] !== query[qj]) continue;
        if (starts[i]) onStart++;
        qj++;
      }
      const density = query.length / (end - start + 1);
      const coverage = query.length / chars.length;
      const value = density * coverage * (1 + onStart / query.length);
      if (best === null || value > best) best = value;
    }

    from = start + 1;
  }

  return best;
}
