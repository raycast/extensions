export interface Profile {
  guid: string;
  name: string;
  hidden?: boolean;
  source?: string;
  commandline?: string;
}

export interface NewTabMenuEntry {
  type: string;
  profile?: string;
  name?: string;
  commandline?: string;
  source?: string;
  entries?: NewTabMenuEntry[];
}

// A minimal regex engine, used instead of JavaScript's native RegExp. Native regex matching can't
// be interrupted once it starts, so a pathological pattern — (a+)+, (a?a?)+, ((ab)+)+ — would
// freeze the profile list while it renders, and a backtracking engine's own recursion can overflow
// the call stack on a long value even for a safe pattern like ".*". This engine avoids both: it
// compiles the pattern into a Thompson NFA (compileProgram) and matches by advancing every
// reachable state together, one input character at a time (matchFull) — the technique RE2 and
// Rust's regex crate use for guaranteed linear-time matching with no backtracking. So nothing needs
// to be rejected up front and nothing needs a step budget — a repeated group with safe
// alternatives, like (dev|prod)+, still matches normally.
type AtomNode =
  | { kind: "char"; test: (ch: string) => boolean }
  | { kind: "any" }
  | { kind: "group"; alt: AltNode }
  | { kind: "start" }
  | { kind: "end" };
type QuantNode = { atom: AtomNode; min: number; max: number; greedy: boolean };
type SeqNode = { atoms: QuantNode[] };
type AltNode = { options: SeqNode[] };

class RegexSyntaxError extends Error {}

// compileQuant below unrolls an explicit {n,m} into n or m literal copies of the atom, so a bound
// this large would blow up the compiled instruction count regardless of the input being matched.
// matchProfiles patterns never legitimately need more than this.
const MAX_QUANT_BOUND = 1000;

// Parses the subset of ECMAScript regex syntax matchProfiles patterns actually use: literals,
// `.`, escapes (`\d\w\s` and their negations, `\.` etc.), `[...]` classes, `(...)`/`(?:...)`
// groups, `|` alternation, and `* + ? {n,m}` quantifiers (with lazy `?` variants). Anything else
// — lookaround, backreferences, unicode property escapes — is unsupported and throws, which
// buildProfileMatcher treats the same as any other malformed pattern.
function parsePattern(pattern: string): AltNode {
  let i = 0;
  const n = pattern.length;
  const peek = () => pattern[i];
  const fail = (msg: string): never => {
    throw new RegexSyntaxError(msg);
  };

  function parseAlt(): AltNode {
    const options = [parseSeq()];
    while (peek() === "|") {
      i++;
      options.push(parseSeq());
    }
    return { options };
  }

  function parseSeq(): SeqNode {
    const atoms: QuantNode[] = [];
    while (i < n && peek() !== "|" && peek() !== ")") atoms.push(parseQuant());
    return { atoms };
  }

  function parseQuant(): QuantNode {
    const atom = parseAtom();
    let min = 1;
    let max = 1;
    let quantified = false;
    const c = peek();
    if (c === "*") {
      min = 0;
      max = Infinity;
      quantified = true;
      i++;
    } else if (c === "+") {
      min = 1;
      max = Infinity;
      quantified = true;
      i++;
    } else if (c === "?") {
      min = 0;
      max = 1;
      quantified = true;
      i++;
    } else if (c === "{") {
      const braces = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
      if (braces) {
        min = parseInt(braces[1], 10);
        max = braces[2] === undefined ? min : braces[3] === "" ? Infinity : parseInt(braces[3], 10);
        if (max < min || min > MAX_QUANT_BOUND || (max !== Infinity && max > MAX_QUANT_BOUND)) {
          return fail("quantifier bound out of range");
        }
        quantified = true;
        i += braces[0].length;
      }
    }
    // Windows Terminal's regex engine rejects a quantified anchor (^?, $*, ^{2}...) as a syntax
    // error rather than matching it literally or ignoring the quantifier, so mirror that here.
    if (quantified && (atom.kind === "start" || atom.kind === "end")) return fail("quantified anchor");
    let greedy = true;
    if (peek() === "?") {
      greedy = false;
      i++;
    }
    return { atom, min, max, greedy };
  }

  function parseAtom(): AtomNode {
    const c = peek();
    if (c === undefined) return fail("unexpected end of pattern");
    if (c === "*" || c === "+" || c === "?" || c === ")") return fail(`unexpected "${c}"`);
    if (c === "(") {
      i++;
      if (pattern.slice(i, i + 2) === "?:") i += 2;
      else if (peek() === "?") return fail("unsupported group modifier");
      const alt = parseAlt();
      if (peek() !== ")") return fail("unbalanced parenthesis");
      i++;
      return { kind: "group", alt };
    }
    if (c === "[") return parseClass();
    if (c === ".") {
      i++;
      return { kind: "any" };
    }
    // matchFull already anchors the whole match, so ^/$ are zero-width assertions here, not
    // literal characters — a pattern like "^PowerShell$" must still match "PowerShell".
    if (c === "^") {
      i++;
      return { kind: "start" };
    }
    if (c === "$") {
      i++;
      return { kind: "end" };
    }
    if (c === "\\") {
      i++;
      return parseEscape();
    }
    i++;
    return { kind: "char", test: (ch) => ch === c };
  }

  function parseEscape(): AtomNode {
    const c = pattern[i];
    i++;
    if (c === undefined) return fail("trailing backslash");
    const predicates: Record<string, (ch: string) => boolean> = {
      d: (ch) => ch >= "0" && ch <= "9",
      D: (ch) => !(ch >= "0" && ch <= "9"),
      w: (ch) => /\w/.test(ch),
      W: (ch) => !/\w/.test(ch),
      s: (ch) => /\s/.test(ch),
      S: (ch) => !/\s/.test(ch),
    };
    return { kind: "char", test: predicates[c] ?? ((ch) => ch === c) };
  }

  function parseClass(): AtomNode {
    i++; // consume "["
    let negate = false;
    if (peek() === "^") {
      negate = true;
      i++;
    }
    const tests: ((ch: string) => boolean)[] = [];
    while (i < n && peek() !== "]") {
      const start = peek();
      if (start === "\\") {
        i++;
        const esc = pattern[i];
        i++;
        if (esc === "d") tests.push((ch) => ch >= "0" && ch <= "9");
        else if (esc === "D") tests.push((ch) => !(ch >= "0" && ch <= "9"));
        else if (esc === "w") tests.push((ch) => /\w/.test(ch));
        else if (esc === "W") tests.push((ch) => !/\w/.test(ch));
        else if (esc === "s") tests.push((ch) => /\s/.test(ch));
        else if (esc === "S") tests.push((ch) => !/\s/.test(ch));
        else tests.push((ch) => ch === esc);
        continue;
      }
      i++;
      if (peek() === "-" && pattern[i + 1] !== "]" && i + 1 < n) {
        i++; // consume "-"
        const end = pattern[i];
        i++;
        tests.push((ch) => ch >= start && ch <= end);
      } else {
        tests.push((ch) => ch === start);
      }
    }
    if (peek() !== "]") return fail("unbalanced bracket");
    i++;
    return { kind: "char", test: (ch) => negate !== tests.some((test) => test(ch)) };
  }

  const result = parseAlt();
  if (i !== n) fail("unexpected trailing characters");
  return result;
}

// Compiles the parsed AST into a Thompson NFA instead of interpreting it recursively. Each
// instruction is one node of that NFA; `split` is the only branch point, and `next`/`next2` link
// the graph together. A `Frag` under construction tracks its entry instruction plus the dangling
// successor slots ("patch list", in Thompson's original terms) still waiting to be pointed at
// whatever comes next.
type CharInst = { op: "char"; test: (ch: string) => boolean; next?: Inst };
type AnyInst = { op: "any"; next?: Inst };
type StartInst = { op: "start"; next?: Inst };
type EndInst = { op: "end"; next?: Inst };
type SplitInst = { op: "split"; next?: Inst; next2?: Inst };
type NopInst = { op: "nop"; next?: Inst };
type MatchInst = { op: "match" };
type Inst = CharInst | AnyInst | StartInst | EndInst | SplitInst | NopInst | MatchInst;

type PatchSlot =
  | { inst: CharInst | AnyInst | StartInst | EndInst | NopInst | SplitInst; slot: "next" }
  | { inst: SplitInst; slot: "next2" };
type Frag = { start: Inst; out: PatchSlot[] };

function patch(out: PatchSlot[], target: Inst): void {
  for (const p of out) {
    if (p.slot === "next2") p.inst.next2 = target;
    else p.inst.next = target;
  }
}

function emptyFrag(): Frag {
  const inst: NopInst = { op: "nop" };
  return { start: inst, out: [{ inst, slot: "next" }] };
}

function concat(a: Frag, b: Frag): Frag {
  patch(a.out, b.start);
  return { start: a.start, out: b.out };
}

function concatAll(frags: Frag[]): Frag {
  return frags.reduce(concat, emptyFrag());
}

function compileAtom(atom: AtomNode): Frag {
  if (atom.kind === "group") return compileAlt(atom.alt);
  if (atom.kind === "char") {
    const inst: CharInst = { op: "char", test: atom.test };
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  if (atom.kind === "any") {
    const inst: AnyInst = { op: "any" };
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  if (atom.kind === "start") {
    const inst: StartInst = { op: "start" };
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  const inst: EndInst = { op: "end" };
  return { start: inst, out: [{ inst, slot: "next" }] };
}

function repeatFrag(atom: AtomNode, count: number): Frag {
  return concatAll(Array.from({ length: count }, () => compileAtom(atom)));
}

function starFrag(atom: AtomNode): Frag {
  const split: SplitInst = { op: "split" };
  const body = compileAtom(atom);
  patch(body.out, split);
  split.next = body.start;
  return { start: split, out: [{ inst: split, slot: "next2" }] };
}

function plusFrag(atom: AtomNode): Frag {
  const split: SplitInst = { op: "split" };
  const body = compileAtom(atom);
  patch(body.out, split);
  split.next = body.start;
  return { start: body.start, out: [{ inst: split, slot: "next2" }] };
}

function optionalFrag(atom: AtomNode): Frag {
  const split: SplitInst = { op: "split" };
  const body = compileAtom(atom);
  split.next = body.start;
  return { start: split, out: [...body.out, { inst: split, slot: "next2" }] };
}

// Whether a quantifier is greedy or lazy only affects which substring a capturing group would
// record — irrelevant here, since buildProfileMatcher only ever asks "does the whole field match"
// (see matchFull). So greedy and lazy compile identically; `q.greedy` is parsed but never consulted.
function compileQuant(q: QuantNode): Frag {
  if (q.max === Infinity) {
    if (q.min === 0) return starFrag(q.atom);
    return concat(repeatFrag(q.atom, q.min - 1), plusFrag(q.atom));
  }
  const optionals = concatAll(Array.from({ length: q.max - q.min }, () => optionalFrag(q.atom)));
  return concat(repeatFrag(q.atom, q.min), optionals);
}

function compileSeq(seq: SeqNode): Frag {
  return concatAll(seq.atoms.map(compileQuant));
}

function compileAlt(alt: AltNode): Frag {
  return alt.options.map(compileSeq).reduceRight((rest, option) => {
    const split: SplitInst = { op: "split" };
    split.next = option.start;
    split.next2 = rest.start;
    return { start: split, out: [...option.out, ...rest.out] };
  });
}

function compileProgram(alt: AltNode): Inst {
  const frag = compileAlt(alt);
  const matchInst: MatchInst = { op: "match" };
  patch(frag.out, matchInst);
  return frag.start;
}

// Epsilon-closure: follows the zero-width instructions (`split`, `nop`, and the anchors when their
// condition holds) until it reaches a `char`/`any`/`match` instruction, adding those to `list`.
// `visited` dedupes instructions already queued at this string position — that's what stops a
// zero-width loop like (a?)* from spinning forever: once its `split` has been visited at a given
// position, revisiting it adds nothing new, so the closure always terminates after at most one
// visit per instruction, and the pattern's remainder (matching past the loop) still gets explored.
// Walked with an explicit stack, not recursion — a flat run of thousands of optional atoms
// (a?a?a?...) chains that many `split`s in a row, and recursing that chain would grow the JS call
// stack with the pattern's size, independent of how long the string being matched is.
function addThread(list: Inst[], visited: Set<Inst>, start: Inst, pos: number, str: string): void {
  const stack: Inst[] = [start];
  while (stack.length > 0) {
    const inst = stack.pop()!;
    if (visited.has(inst)) continue;
    visited.add(inst);
    if (inst.op === "split") {
      stack.push(inst.next2!, inst.next!);
    } else if (inst.op === "nop") {
      stack.push(inst.next!);
    } else if (inst.op === "start") {
      if (pos === 0) stack.push(inst.next!);
    } else if (inst.op === "end") {
      if (pos === str.length) stack.push(inst.next!);
    } else {
      list.push(inst);
    }
  }
}

// Runs the compiled NFA over `str` breadth-first, one input position at a time (Pike's VM) instead
// of recursing per character the way a backtracking engine would. Every thread advances together, so
// the call stack never grows with the length of `str` or with the pattern's backtracking search
// space — a 2,000-character value and a pathological pattern like (a+)+ cost the same handful of
// stack frames as a one-character match, and total work is bounded by str.length × the pattern's
// compiled size, so nothing can blow up exponentially and no step budget is needed.
function matchFull(prog: Inst, str: string): boolean {
  let current: Inst[] = [];
  addThread(current, new Set(), prog, 0, str);

  for (let pos = 0; pos < str.length; pos++) {
    if (current.length === 0) return false;
    const next: Inst[] = [];
    const visited = new Set<Inst>();
    const ch = str[pos];
    for (const inst of current) {
      if (inst.op === "char" && inst.test(ch)) addThread(next, visited, inst.next!, pos + 1, str);
      else if (inst.op === "any") addThread(next, visited, inst.next!, pos + 1, str);
    }
    current = next;
  }

  return current.some((inst) => inst.op === "match");
}

// A matchProfiles entry matches a profile when ANY provided field (name/commandline/source)
// fully matches that field's regex — mirrors Windows Terminal's MatchProfilesEntry. Empty profile
// fields never match, so "source": ".*" skips local profiles and "commandline": ".*" skips
// profiles without a command line. An entry with no patterns, or a malformed or unsupported
// regex, matches nothing rather than crashing or matching all.
export function buildProfileMatcher(entry: NewTabMenuEntry): ((profile: Profile) => boolean) | null {
  const specs: { pattern: string; get: (profile: Profile) => string }[] = [];
  if (entry.name !== undefined) specs.push({ pattern: entry.name, get: (p) => p.name });
  if (entry.commandline !== undefined) specs.push({ pattern: entry.commandline, get: (p) => p.commandline ?? "" });
  if (entry.source !== undefined) specs.push({ pattern: entry.source, get: (p) => p.source ?? "" });
  if (specs.length === 0) return null;

  let matchers: { prog: Inst; get: (profile: Profile) => string }[];
  try {
    matchers = specs.map(({ pattern, get }) => ({ prog: compileProgram(parsePattern(pattern)), get }));
  } catch {
    return null;
  }

  return (profile: Profile) =>
    matchers.some(({ prog, get }) => {
      const value = get(profile);
      return value.length > 0 && matchFull(prog, value);
    });
}

// Mirrors Windows Terminal's own newTabMenu resolution (CascadiaSettingsSerialization.cpp):
// two passes over the tree. Pass 1 collects every profile referenced by a "profile" or
// "matchProfiles" entry anywhere (including inside folders). Pass 2 walks the tree again to
// build the final order — "remainingProfiles" expands to profiles NOT in that pass-1 set, at
// the position it appears, so a later explicit reference still lands after the remainder.
export function resolveNewTabMenuOrder(profiles: Profile[], newTabMenu: NewTabMenuEntry[]): string[] {
  const referenced = new Set<string>();

  function collectReferenced(entries: NewTabMenuEntry[]) {
    for (const entry of entries) {
      if (entry.type === "profile" && entry.profile) {
        const match = profiles.find((p) => p.guid === entry.profile || p.name === entry.profile);
        if (match) referenced.add(match.guid);
      } else if (entry.type === "matchProfiles") {
        const matcher = buildProfileMatcher(entry);
        if (matcher) profiles.forEach((p) => matcher(p) && referenced.add(p.guid));
      } else if (entry.type === "folder" && entry.entries) {
        collectReferenced(entry.entries);
      }
    }
  }
  collectReferenced(newTabMenu);

  const order: string[] = [];
  const placed = new Set<string>();
  function addGuid(guid: string) {
    if (placed.has(guid)) return;
    placed.add(guid);
    order.push(guid);
  }

  function build(entries: NewTabMenuEntry[]) {
    for (const entry of entries) {
      if (entry.type === "profile" && entry.profile) {
        const match = profiles.find((p) => p.guid === entry.profile || p.name === entry.profile);
        if (match) addGuid(match.guid);
      } else if (entry.type === "matchProfiles") {
        const matcher = buildProfileMatcher(entry);
        if (matcher) profiles.forEach((p) => matcher(p) && addGuid(p.guid));
      } else if (entry.type === "folder" && entry.entries) {
        build(entry.entries);
      } else if (entry.type === "remainingProfiles") {
        profiles.forEach((p) => !referenced.has(p.guid) && addGuid(p.guid));
      }
    }
  }
  build(newTabMenu);

  return order;
}
