import { Dictionaries } from "./dictionaries";

/** Where a Latin chunk sits in the word; vowels are written differently at the start and end. */
type Position = "initial" | "medial" | "final";
type Rule = [latin: string, persian: string[] | Partial<Record<Position, string[]>>];

/**
 * Latin spellings and the Persian letters they can stand for. Short vowels (a, e, o in the
 * middle of a word) are usually not written in Persian, so they can map to nothing.
 * Longer patterns come first so "kh" is tried before "k".
 */
const RULES: Rule[] = [
  ["kha", { initial: ["خا", "خوا"], medial: ["خا", "خوا", "خ"], final: ["خا", "خه"] }],
  ["kh", ["خ"]],
  ["gh", ["ق", "غ"]],
  ["sh", ["ش"]],
  ["ch", ["چ"]],
  ["zh", ["ژ"]],
  ["aa", { initial: ["آ"], medial: ["ا", "عا"], final: ["ا"] }],
  ["ee", ["ی"]],
  ["oo", { initial: ["او"], medial: ["و"], final: ["و"] }],
  ["ou", { initial: ["او"], medial: ["و"], final: ["و"] }],
  ["ei", { initial: ["ای"], medial: ["ی", "ئی"], final: ["ی"] }],
  ["ey", { initial: ["ای"], medial: ["ی"], final: ["ی"] }],
  ["â", { initial: ["آ"], medial: ["ا"], final: ["ا"] }],
  ["a", { initial: ["ا", "آ", "ع"], medial: ["ا", "", "ع"], final: ["ا", "ه"] }],
  ["e", { initial: ["ا", "ع"], medial: ["", "ع"], final: ["ه", "", "ی"] }],
  ["o", { initial: ["ا", "او", "ع"], medial: ["", "و", "ع"], final: ["و", "ه"] }],
  ["i", { initial: ["ای"], medial: ["ی"], final: ["ی"] }],
  ["u", { initial: ["او"], medial: ["و"], final: ["و"] }],
  ["b", ["ب"]],
  ["p", ["پ"]],
  ["t", ["ت", "ط"]],
  ["s", ["س", "ص", "ث"]],
  ["j", ["ج"]],
  ["h", ["ه", "ح", ""]],
  ["d", ["د"]],
  ["z", ["ز", "ذ", "ض", "ظ"]],
  ["r", ["ر"]],
  ["f", ["ف"]],
  ["q", ["ق", "غ"]],
  ["k", ["ک"]],
  ["g", ["گ"]],
  ["l", ["ل"]],
  ["m", ["م"]],
  ["n", ["ن"]],
  ["v", ["و"]],
  ["w", ["و"]],
  ["y", ["ی"]],
  ["x", ["خ", "کس"]],
  ["c", ["ک", "س"]],
  ["'", ["ع", "ئ", "ء", ""]],
  ["2", ["ع", "ئ"]],
];

/** What to write when no real word matches: the first option, short vowels dropped. */
const FALLBACK: Record<string, Partial<Record<Position, string>>> = {
  a: { medial: "ا" },
  e: { medial: "" },
  o: { medial: "و" },
  h: { medial: "ه", final: "ه", initial: "ه" },
};

const PUNCTUATION: Record<string, string> = { ",": "،", "?": "؟", ";": "؛" };

interface TrieNode {
  next: Map<string, TrieNode>;
  rank?: number;
}

const MAX_STEPS = 40_000;

export class Finglish {
  private readonly root: TrieNode = { next: new Map() };

  constructor(dicts: Dictionaries) {
    for (const [word, rank] of dicts.faRank) {
      let node = this.root;
      for (const ch of word) {
        let child = node.next.get(ch);
        if (!child) node.next.set(ch, (child = { next: new Map() }));
        node = child;
      }
      if (node.rank === undefined || rank < node.rank) node.rank = rank;
    }
  }

  /** Real Persian words the Latin `word` could be, most common first. */
  candidates(word: string, max = 5): string[] {
    const input = word.toLowerCase();
    const found = new Map<string, number>();
    let steps = 0;

    const walk = (node: TrieNode, text: string): TrieNode | undefined => {
      for (const ch of text) {
        const child = node.next.get(ch);
        if (!child) return undefined;
        node = child;
      }
      return node;
    };

    const search = (pos: number, node: TrieNode, out: string) => {
      if (++steps > MAX_STEPS) return;
      if (pos === input.length) {
        if (node.rank !== undefined && !found.has(out)) found.set(out, node.rank);
        return;
      }
      // A doubled consonant (tavallod) is written once.
      if (pos > 0 && input[pos] === input[pos - 1] && !"aeiou".includes(input[pos])) search(pos + 1, node, out);
      for (const [latin, persian] of RULES) {
        if (!input.startsWith(latin, pos)) continue;
        const position: Position = pos === 0 ? "initial" : pos + latin.length === input.length ? "final" : "medial";
        const options = Array.isArray(persian) ? persian : (persian[position] ?? persian.medial ?? []);
        for (const option of options) {
          const child = walk(node, option);
          if (child) search(pos + latin.length, child, out + option);
        }
      }
    };

    search(0, this.root, "");
    return Array.from(found)
      .sort((a, b) => a[1] - b[1])
      .slice(0, max)
      .map(([w]) => w);
  }

  /** A letter-by-letter reading for words that aren't in the word list. */
  transliterate(word: string): string {
    const input = word.toLowerCase();
    let out = "";
    let pos = 0;
    while (pos < input.length) {
      const rule = RULES.find(([latin]) => input.startsWith(latin, pos));
      if (!rule) {
        out += input[pos++];
        continue;
      }
      const [latin, persian] = rule;
      const position: Position = pos === 0 ? "initial" : pos + latin.length === input.length ? "final" : "medial";
      const fallback = FALLBACK[latin]?.[position];
      const options = Array.isArray(persian) ? persian : (persian[position] ?? persian.medial ?? []);
      out += fallback ?? options[0] ?? "";
      pos += latin.length;
    }
    return out;
  }

  /** Converts Finglish text to Persian, word by word, keeping punctuation and anything that isn't Latin. */
  convert(text: string): string {
    return text
      .split(/(\s+)/)
      .map((token, i) => {
        if (i % 2 === 1) return token;
        const match = token.match(/^([^\p{L}'2]*)([\p{L}'2]+?)([^\p{L}]*)$/u);
        if (!match || !/^[a-zâ'2]+$/i.test(match[2]) || !/[a-zâ]/i.test(match[2])) return token;
        const [, before, core, after] = match;
        const persian = this.candidates(core, 1)[0] ?? this.transliterate(core);
        return before + persian + Array.from(after, (c) => PUNCTUATION[c] ?? c).join("");
      })
      .join("");
  }
}
