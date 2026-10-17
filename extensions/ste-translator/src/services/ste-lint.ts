/**
 * Deterministic linter for the structural STE rules that can be checked without ASD's dictionary.
 * TypeScript port of danyuchn/asd-ste100-skill `scripts/ste-lint.py` (regex heuristics, not a parser).
 *
 * It never flags hedges or modality (may, might, could): confidence is content, and a linter
 * that pushes hedges out would change claims.
 */

export type LintLevel = "advisory-free" | "advisory";

export interface LintFinding {
  line: number;
  col: number;
  rule: string;
  /** "advisory-free" findings are hard violations; "advisory" findings are only suggestions. */
  level: LintLevel;
  match: string;
  message: string;
}

export interface LintResult {
  findings: LintFinding[];
  words: number;
}

const IRREGULAR_PARTICIPLES =
  "given|taken|made|done|found|seen|known|shown|written|built|sent|set|run|read|kept|held|left|put|cut|hit|let|shut|split|spread|begun|become|come|gone|got|gotten|lost|met|paid|said|sold|told|thought|brought|bought|caught|taught|won|worn|torn|born|drawn|grown|thrown|flown|driven|risen|chosen|broken|spoken|frozen|hidden|ridden|forgotten|fallen|eaten|beaten|understood|stood|struck|stuck|swung|hung|led|fed|bled|fled|sped|bound|wound|dug|spun|slid|bit|lit|quit";
const PASSIVE_PARTICIPLES =
  "given|taken|made|done|found|seen|known|shown|written|built|sent|set|run|read|kept|held|left|put";
const MODAL_PERFECT_PREFIX = /\b(?:may|might|could|should|would|must|can|will|shall)(?:\s+not|n['’]t)?\s+$/i;

interface Rule {
  id: string;
  level: LintLevel;
  pattern: RegExp;
  message: string;
}

const RULES: Rule[] = [
  {
    id: "semicolon",
    level: "advisory-free",
    pattern: /;/g,
    message: "STE bans the semicolon (Rule 8.1). Split into separate sentences.",
  },
  {
    id: "phrasal-verb",
    level: "advisory-free",
    pattern:
      /\b(spin(?:ning|s)? up|spun up|reach(?:ing|es|ed)? out|div(?:e|es|ing|ed) into|dove into|kick(?:ing|s|ed)? off|circl(?:e|es|ing|ed) back|touch(?:ing|es|ed)? base)\b/gi,
    message: "Soft phrasal verb. Use the single plain verb (start, contact, read, begin).",
  },
  {
    id: "marketing-adjective",
    level: "advisory-free",
    pattern:
      /\b(seamless(?:ly)?|robust(?:ly)?|cutting-edge|effortless(?:ly)?|blazing[- ]fast|world-class|state-of-the-art|game-chang(?:ing|er))\b/gi,
    message: "Marketing adjective. Delete, or replace with the measurement that earns the claim.",
  },
  {
    id: "nominalization",
    level: "advisory-free",
    pattern:
      /\b(perform|performs|performed|conduct|conducts|conducted|carry out|carries out|carried out)\s+(?:a|an|the)\s+\w+(?:tion|sion|ment|ance|ence|ysis)\b/gi,
    message: "Action frozen into a noun. Use the verb (analyze, not perform an analysis of).",
  },
  {
    id: "passive-voice",
    level: "advisory",
    pattern: new RegExp(
      `\\b(is|are|was|were|been|being)\\s+(\\w+ed|${PASSIVE_PARTICIPLES})\\b(?!\\s+(?:to|for|by)\\s+\\w+ing)`,
      "gi",
    ),
    message:
      "Possible passive voice. Name the actor and use an active verb, unless the actor is unknown or irrelevant.",
  },
  {
    id: "present-perfect",
    level: "advisory",
    pattern: new RegExp(
      `(?<!\\bmay )(?<!\\bmight )(?<!\\bcould )(?<!\\bshould )(?<!\\bwould )(?<!\\bmust )\\b(has|have|had)\\s+(?:been\\s+)?(?:\\w+(?:ed|en)|${IRREGULAR_PARTICIPLES})\\b`,
      "gi",
    ),
    message: "Compound tense. Use simple past/present unless current relevance is the point (then keep and flag).",
  },
];

/** Verbs that are often rotated for one action. error/fault/failure are different concepts and stay out. */
const SYNONYM_GROUPS: string[][] = [
  ["check", "verify", "confirm", "validate"],
  ["delete", "remove", "erase"],
  ["start", "launch", "begin", "initiate"],
  ["stop", "halt", "terminate"],
  ["show", "display"],
  ["use", "utilize", "employ"],
  ["fix", "repair", "correct"],
  ["send", "transmit"],
  ["get", "retrieve", "fetch", "obtain"],
  ["change", "modify", "alter"],
];

export const MAX_SENTENCE_WORDS = 25;

const CODE_FENCE = /^(```|~~~)/;
const INLINE_CODE = /`[^`]*`/g;
const LIST_ITEM_START = /^(?<indent> {0,3})(?<marker>[-*+]|[0-9]+[.)])(?<gap> +)(?<body>.*)$/;
const CONJUNCTION_END = /\b(?:and|or)\s*$/i;
const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;
const STANDALONE_LINE = /^ {0,3}(?:#|<|(?:[-*_=] *){3,}$)/;
const BLOCKQUOTE_PREFIX = /^ {0,3}(?:> ?)+/;
const ANY_LIST_ITEM = /^\s*(?:[-*+]|[0-9]+[.)])(?:\s|$)/;
const SENTENCE_END = /[.!?]["'”’)\]*_]*$/;
const OPENERS = "\"'“‘([*_";
const ABBREVIATIONS = new Set(["vs.", "cf.", "approx.", "mr.", "mrs.", "ms.", "dr.", "fig.", "no."]);
const DOTTED_ABBREVIATION = /^(?:[a-z]\.){2,}$/i;

function lstripChars(text: string, chars: string): string {
  let i = 0;
  while (i < text.length && chars.includes(text[i])) i++;
  return text.slice(i);
}

function maskInlineCode(text: string): string {
  return text.replace(INLINE_CODE, (m) => " ".repeat(m.length));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Offset of each sentence start in `text`. */
function sentenceStarts(text: string): number[] {
  const words = [...text.matchAll(/\S+/g)];
  if (words.length === 0) return [0];
  const starts = [words[0].index];
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i][0];
    const end = SENTENCE_END.exec(word);
    if (!end) continue;
    const core = lstripChars(word.slice(0, end.index + 1), OPENERS);
    if (ABBREVIATIONS.has(core.toLowerCase())) continue;
    const nextFirst = lstripChars(words[i + 1][0], OPENERS).charAt(0);
    if (
      DOTTED_ABBREVIATION.test(core) &&
      !(nextFirst !== "" && nextFirst === nextFirst.toUpperCase() && nextFirst !== nextFirst.toLowerCase())
    ) {
      continue;
    }
    starts.push(words[i + 1].index);
  }
  return starts;
}

interface Piece {
  line: number;
  column: number;
  text: string;
}

function longSentenceFindings(pieces: Piece[]): LintFinding[] {
  const offsets: number[] = [];
  let position = 0;
  for (const piece of pieces) {
    offsets.push(position);
    position += piece.text.length + 1;
  }
  const joined = pieces.map((p) => p.text).join(" ");
  const findings: LintFinding[] = [];
  const starts = sentenceStarts(joined);
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : joined.length;
    const n = wordCount(joined.slice(start, end));
    if (n <= MAX_SENTENCE_WORDS) return;
    let index = 0;
    while (index + 1 < offsets.length && offsets[index + 1] <= start) index++;
    const piece = pieces[index];
    findings.push({
      line: piece.line,
      col: piece.column + start - offsets[index] + 1,
      rule: "long-sentence",
      level: "advisory-free",
      match: `${n} words`,
      message: `Sentence has ${n} words (cap ${MAX_SENTENCE_WORDS}). Split it.`,
    });
  });
  return findings;
}

function splitTableRow(line: string): { text: string; column: number }[] | undefined {
  let left = line.length - line.trimStart().length;
  const right = line.trimEnd().length;
  let content = line.slice(left, right);
  if (!content.includes("|")) return undefined;
  if (content.startsWith("|")) {
    content = content.slice(1);
    left += 1;
  }
  if (content.endsWith("|")) content = content.slice(0, -1);
  const rawCells = content.split(/(?<!\\)\|/);
  if (rawCells.length < 2) return undefined;
  const cells: { text: string; column: number }[] = [];
  let column = left;
  for (const raw of rawCells) {
    const leading = raw.length - raw.trimStart().length;
    cells.push({ text: raw.trim(), column: column + leading });
    column += raw.length + 1;
  }
  return cells;
}

/** Map zero-based line index to table cells; the separator row anchors detection. */
function markdownTableCells(lines: string[]): Map<number, { text: string; column: number }[]> {
  const table = new Map<number, { text: string; column: number }[]>();
  let index = 1;
  while (index < lines.length) {
    const separator = splitTableRow(lines[index]);
    const header = splitTableRow(lines[index - 1]);
    if (
      !separator ||
      !header ||
      separator.length !== header.length ||
      !separator.every((c) => TABLE_SEPARATOR_CELL.test(c.text))
    ) {
      index++;
      continue;
    }
    table.set(index - 1, header);
    table.set(index, []);
    index++;
    while (index < lines.length) {
      const row = splitTableRow(lines[index]);
      if (!row || row.length !== separator.length) break;
      table.set(index, row);
      index++;
    }
  }
  return table;
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

function isListContinuation(line: string, contentIndent: number): boolean {
  if (!line.trim()) return true;
  if (LIST_ITEM_START.test(line)) return false;
  return leadingSpaces(line) >= contentIndent;
}

function danglingConjunctionFindings(text: string): LintFinding[] {
  const lines = text.split(/\r\n|\r|\n/);
  const findings: LintFinding[] = [];
  let inFence = false;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (CODE_FENCE.test(line.trim())) {
      inFence = !inFence;
      index++;
      continue;
    }
    const start = inFence ? null : LIST_ITEM_START.exec(line);
    if (!start?.groups) {
      index++;
      continue;
    }
    const contentIndent = start.groups.indent.length + start.groups.marker.length + start.groups.gap.length;
    const itemLines: [number, string][] = [[index, start.groups.body]];
    let next = index + 1;
    let itemFence = false;
    while (next < lines.length) {
      const candidate = lines[next];
      if (CODE_FENCE.test(candidate.trim())) {
        itemFence = !itemFence;
        next++;
        continue;
      }
      if (itemFence) {
        next++;
        continue;
      }
      if (!isListContinuation(candidate, contentIndent)) break;
      itemLines.push([next, candidate]);
      next++;
    }
    const meaningful = itemLines
      .map(([i, l]) => [i, l.replace(INLINE_CODE, " CODE ").trim()] as [number, string])
      .filter(([, l]) => l.length > 0);
    if (meaningful.length > 0) {
      const [endIndex, endLine] = meaningful[meaningful.length - 1];
      if (CONJUNCTION_END.test(endLine)) {
        let findingLine: number;
        let findingCol: number;
        if (endIndex === index) {
          findingLine = index + 1;
          findingCol = start.groups.indent.length + 1;
        } else {
          const raw = itemLines.find(([i]) => i === endIndex)?.[1] ?? "";
          const masked = maskInlineCode(raw);
          const m = CONJUNCTION_END.exec(masked);
          findingLine = endIndex + 1;
          findingCol = m ? m.index + 1 : 1;
        }
        findings.push({
          line: findingLine,
          col: findingCol,
          rule: "dangling-conjunction",
          level: "advisory-free",
          match: endLine,
          message: "List item ends with a coordinating conjunction. Complete the item or join it with the next item.",
        });
      }
    }
    index = next;
  }
  return findings;
}

function wordPattern(base: string): RegExp {
  return new RegExp(`\\b${base}(?:s|es|ed|d|ing)?\\b`, "i");
}

export function lintText(text: string): LintResult {
  const findings: LintFinding[] = [];
  let words = 0;
  let inFence = false;
  const lines = text.split(/\r\n|\r|\n/);
  const tableCells = markdownTableCells(lines);
  const seenSynonyms = new Map<string, { line: number; col: number; match: string }>();
  const block: Piece[] = [];
  let inQuote = false;

  const flush = () => {
    findings.push(...longSentenceFindings(block));
    block.length = 0;
  };

  lines.forEach((rawLine, i) => {
    const lineno = i + 1;
    if (CODE_FENCE.test(rawLine.trim())) {
      flush();
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const isTable = tableCells.has(i);
    const segments = tableCells.get(i) ?? [{ text: rawLine, column: 0 }];
    const quote = BLOCKQUOTE_PREFIX.exec(rawLine);
    const isQuote = quote !== null;
    const content = quote ? rawLine.slice(quote[0].length) : rawLine;
    const standalone = STANDALONE_LINE.test(content);
    if (isTable || !content.trim() || standalone || ANY_LIST_ITEM.test(content) || isQuote !== inQuote) flush();
    inQuote = isQuote;
    for (const segment of segments) {
      const line = maskInlineCode(segment.text);
      words += wordCount(line);
      for (const rule of RULES) {
        for (const m of line.matchAll(rule.pattern)) {
          if (rule.id === "present-perfect" && MODAL_PERFECT_PREFIX.test(line.slice(0, m.index))) continue;
          findings.push({
            line: lineno,
            col: segment.column + m.index + 1,
            rule: rule.id,
            level: rule.level,
            match: m[0],
            message: rule.message,
          });
        }
      }
      SYNONYM_GROUPS.forEach((group, gi) => {
        for (const base of group) {
          const key = `${gi}:${base}`;
          if (seenSynonyms.has(key)) continue;
          const m = wordPattern(base).exec(line);
          if (m) seenSynonyms.set(key, { line: lineno, col: segment.column + m.index + 1, match: m[0] });
        }
      });
      const skip = quote && !isTable ? quote[0].length : 0;
      if (line.slice(skip).trim()) block.push({ line: lineno, column: segment.column + skip, text: line.slice(skip) });
      if (isTable) flush();
    }
    if (standalone) flush();
  });
  flush();

  SYNONYM_GROUPS.forEach((group, gi) => {
    const present = group
      .map((base) => ({ base, seen: seenSynonyms.get(`${gi}:${base}`) }))
      .filter((p): p is { base: string; seen: { line: number; col: number; match: string } } => p.seen !== undefined)
      .sort((a, b) => a.seen.line - b.seen.line || a.seen.col - b.seen.col);
    if (present.length > 1) {
      const first = present[0].base;
      for (const { base, seen } of present.slice(1)) {
        findings.push({
          line: seen.line,
          col: seen.col,
          rule: "synonym-rotation",
          level: "advisory",
          match: seen.match,
          message: `If '${base}' and '${first}' name the same action, pick one and use it every time.`,
        });
      }
    }
  });
  findings.push(...danglingConjunctionFindings(text));
  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  return { findings, words };
}

export function hardFindings(findings: LintFinding[]): LintFinding[] {
  return findings.filter((f) => f.level === "advisory-free");
}
