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
// Rust's regex crate use for guaranteed linear-time matching with no backtracking. So no pattern
// needs rejecting for how it might backtrack — a repeated group with safe alternatives, like
// (dev|prod)+, still matches normally, and so does (a+)+. A large bounded quantifier on a simple
// atom, like (a|b){0,4000}, is unbounded in practice too — compileCountedRepeat gives it a counter
// instead of unrolling it, so neither compiled size nor matching cost grows with the bound.
type AtomNode =
  | { kind: "char"; test: (ch: string) => boolean }
  | { kind: "any" }
  | { kind: "group"; alt: AltNode }
  | { kind: "start" }
  | { kind: "end" }
  | { kind: "boundary"; negate: boolean };
type QuantNode = { atom: AtomNode; min: number; max: number; greedy: boolean };
type SeqNode = { atoms: QuantNode[] };
type AltNode = { options: SeqNode[] };

class RegexSyntaxError extends Error {}
class RegexTooLargeError extends Error {}

// compileQuant unrolls a *small* {n,m} into that many copies of the atom — cheap, and it's what
// lets a bounded quantifier nest freely inside another (e.g. (a?)*). A *large* bound instead
// compiles through compileCountedRepeat, a single shared instruction the matcher's thread carries
// a counter through, so the compiled size and matching cost stay independent of how big the bound
// is (see MAX_MATCH_STEPS). This cap remains as a backstop against structural blowup unrelated to
// quantifier size — e.g. an alternation with an implausible number of branches.
const MAX_PROGRAM_SIZE = 50000;

// Below this, compileQuant unrolls a {n,m} into that many literal copies (cheap, and lets it nest
// inside another quantifier); at or above it, compileCountedRepeat is used instead — no nesting
// support, but the compiled size and matching cost no longer scale with the bound.
const UNROLL_THRESHOLD = 20;

// Parses the subset of ICU regex syntax (the flavor Windows Terminal itself matches with) that
// matchProfiles patterns actually use: literals, `.`, escapes (`\d\w\s` and their negations, `\.`
// etc.), the `\b`/`\B` word-boundary assertions, `[...]` classes, `(...)`/`(?:...)` groups, the
// `(?i)`/`(?i:...)` case-insensitivity flag, `|` alternation, and `* + ? {n,m}` quantifiers (with
// lazy `?` variants). Anything else — lookaround, backreferences, unicode property escapes — is
// unsupported and throws, which buildProfileMatcher treats the same as a malformed pattern.
function parsePattern(pattern: string): AltNode {
  let i = 0;
  const n = pattern.length;
  const peek = () => pattern[i];
  const fail = (msg: string): never => {
    throw new RegexSyntaxError(msg);
  };

  // Set by (?i) and restored when the enclosing group closes, mirroring ICU: the flag runs from
  // where it appears to the end of that group, subsequent `|` branches included. It's applied as
  // each character test is built, so the compiled program needs no notion of case at all.
  let ignoreCase = false;
  const foldCase = (test: (ch: string) => boolean) => {
    if (!ignoreCase) return test;
    return (ch: string) => test(ch) || test(ch.toLowerCase()) || test(ch.toUpperCase());
  };
  const charAtom = (test: (ch: string) => boolean): AtomNode => ({ kind: "char", test: foldCase(test) });

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
        if (max < min) return fail("quantifier bounds out of order");
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
      const outerIgnoreCase = ignoreCase;
      if (peek() === "?") {
        // "?:" plain group, "?i)" / "?-i)" a flag switch, "?i:" a flag scoped to this group.
        const modifier = /^\?(-?)(i*)([:)])/.exec(pattern.slice(i));
        if (!modifier) return fail("unsupported group modifier");
        const [consumed, disable, flags, delimiter] = modifier;
        if (flags === "" && delimiter === ")") return fail("empty inline flags");
        if (flags !== "") ignoreCase = disable !== "-";
        i += consumed.length;
        // (?i) is a switch, not a group: it matches nothing itself, and deliberately leaves
        // ignoreCase set for whatever follows it in the enclosing group.
        if (delimiter === ")") return { kind: "group", alt: { options: [{ atoms: [] }] } };
      }
      const alt = parseAlt();
      if (peek() !== ")") return fail("unbalanced parenthesis");
      i++;
      ignoreCase = outerIgnoreCase;
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
    return charAtom((ch) => ch === c);
  }

  const escapePredicates: Record<string, (ch: string) => boolean> = {
    d: (ch) => ch >= "0" && ch <= "9",
    D: (ch) => !(ch >= "0" && ch <= "9"),
    w: (ch) => /\w/.test(ch),
    W: (ch) => !/\w/.test(ch),
    s: (ch) => /\s/.test(ch),
    S: (ch) => !/\s/.test(ch),
  };

  function parseEscape(): AtomNode {
    const c = pattern[i];
    i++;
    if (c === undefined) return fail("trailing backslash");
    // \b and \B are zero-width assertions about the surrounding characters, not the letters
    // "b"/"B" — reading them literally is what made \bPowerShell\b miss the PowerShell profile.
    if (c === "b" || c === "B") return { kind: "boundary", negate: c === "B" };
    const predicate = escapePredicates[c];
    if (predicate) return charAtom(predicate);
    // An escaped letter or digit that isn't one of the above is a construct this engine doesn't
    // implement (\A, \p{...}, a backreference). Reject the pattern rather than matching it as a
    // literal, which would silently match the wrong profiles.
    if (/[A-Za-z0-9]/.test(c)) return fail(`unsupported escape "\\${c}"`);
    return charAtom((ch) => ch === c);
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
        if (esc === undefined) return fail("trailing backslash");
        const predicate = escapePredicates[esc];
        if (predicate) tests.push(predicate);
        else if (/[A-Za-z0-9]/.test(esc)) return fail(`unsupported escape "\\${esc}"`);
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
    // Case folding has to happen inside the negation, not around it: (?i)[^a] means "neither a
    // nor A", so folding the finished (already negated) test would let it match "A".
    const member = foldCase((ch) => tests.some((test) => test(ch)));
    return { kind: "char", test: (ch) => negate !== member(ch) };
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
type BoundaryInst = { op: "boundary"; negate: boolean; next?: Inst };
type SplitInst = { op: "split"; next?: Inst; next2?: Inst };
type NopInst = { op: "nop"; next?: Inst };
type MatchInst = { op: "match" };
// A counted repeat: one shared instruction, however large `max` is. `bodyStart` is entered again
// each rep instead of being duplicated per rep — see compileCountedRepeat and the `count`/`countFor`
// fields threads carry through addThread/matchFull.
type RepeatInst = { op: "repeat"; id: number; min: number; max: number; bodyStart: Inst; next?: Inst };
// The body's own exit, patched to loop back through here rather than straight to `repeat`, so the
// matcher can tell "just finished one more rep of this repeat" apart from "entering it fresh".
type IncrementInst = { op: "increment"; repeat: RepeatInst };
type Inst =
  | CharInst
  | AnyInst
  | StartInst
  | EndInst
  | BoundaryInst
  | SplitInst
  | NopInst
  | MatchInst
  | RepeatInst
  | IncrementInst;

type PatchSlot =
  | { inst: CharInst | AnyInst | StartInst | EndInst | BoundaryInst | NopInst | SplitInst | RepeatInst; slot: "next" }
  | { inst: SplitInst; slot: "next2" };
type Frag = { start: Inst; out: PatchSlot[] };

// Every instruction is created through here, so the running total covers nested unrolling too —
// e.g. small quantifiers nested several levels deep, each individually under UNROLL_THRESHOLD but
// multiplying together — and compilation gives up partway through rather than after building the
// whole oversized program.
let instructionCount = 0;

function newInst<T extends Inst>(inst: T): T {
  if (++instructionCount > MAX_PROGRAM_SIZE) throw new RegexTooLargeError("pattern is too large to compile");
  return inst;
}

function patch(out: PatchSlot[], target: Inst): void {
  for (const p of out) {
    if (p.slot === "next2") p.inst.next2 = target;
    else p.inst.next = target;
  }
}

function emptyFrag(): Frag {
  const inst: NopInst = newInst({ op: "nop" });
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
    const inst: CharInst = newInst({ op: "char", test: atom.test });
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  if (atom.kind === "any") {
    const inst: AnyInst = newInst({ op: "any" });
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  if (atom.kind === "start") {
    const inst: StartInst = newInst({ op: "start" });
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  if (atom.kind === "end") {
    const inst: EndInst = newInst({ op: "end" });
    return { start: inst, out: [{ inst, slot: "next" }] };
  }
  const inst: BoundaryInst = newInst({ op: "boundary", negate: atom.negate });
  return { start: inst, out: [{ inst, slot: "next" }] };
}

// Counts up rather than building the array first, so an absurd count like a{999999999} trips the
// instruction budget partway through instead of trying to size an array for all of it.
function repeatFrag(atom: AtomNode, count: number): Frag {
  const frags: Frag[] = [];
  for (let copy = 0; copy < count; copy++) frags.push(compileAtom(atom));
  return concatAll(frags);
}

function starFrag(atom: AtomNode): Frag {
  const split: SplitInst = newInst({ op: "split" });
  const body = compileAtom(atom);
  patch(body.out, split);
  split.next = body.start;
  return { start: split, out: [{ inst: split, slot: "next2" }] };
}

function plusFrag(atom: AtomNode): Frag {
  const split: SplitInst = newInst({ op: "split" });
  const body = compileAtom(atom);
  patch(body.out, split);
  split.next = body.start;
  return { start: body.start, out: [{ inst: split, slot: "next2" }] };
}

function optionalFrag(atom: AtomNode): Frag {
  const split: SplitInst = newInst({ op: "split" });
  const body = compileAtom(atom);
  split.next = body.start;
  return { start: split, out: [...body.out, { inst: split, slot: "next2" }] };
}

// compileCountedRepeat's counter is a single (count, countFor) pair per thread, not a stack, so it
// can't tell two active repeats apart — a quantified atom that itself contains a quantifier (e.g.
// (a{5}){500}) can't safely go through it. Every atom below UNROLL_THRESHOLD is quantified with
// its default {1,1} (see parseQuant), so this is only true when something was genuinely repeated.
function hasNestedQuantifier(atom: AtomNode): boolean {
  if (atom.kind !== "group") return false;
  return atom.alt.options.some((seq) =>
    seq.atoms.some((q) => q.min !== 1 || q.max !== 1 || hasNestedQuantifier(q.atom)),
  );
}

let nextRepeatId = 0;
// Indexed by RepeatInst.id, so addThread's dedup key can look up a repeat's `min` from just the
// `countFor` a thread carries, without every instruction needing its own back-pointer to it.
let repeatsById: RepeatInst[] = [];

// Compiles atom{min,max} (max possibly Infinity) as one `repeat` instruction plus one copy of the
// atom's body, instead of unrolling — see the `repeat`/`increment` handling in addThread for how a
// thread's counter takes the place of the copies compileQuant's other branch would otherwise make.
function compileCountedRepeat(atom: AtomNode, min: number, max: number): Frag {
  if (hasNestedQuantifier(atom)) {
    throw new RegexTooLargeError("a quantifier this large can't wrap another quantifier");
  }
  const repeat: RepeatInst = newInst({
    op: "repeat",
    id: nextRepeatId++,
    min,
    max,
    bodyStart: undefined as unknown as Inst,
  });
  repeatsById[repeat.id] = repeat;
  const body = compileAtom(atom);
  const increment: IncrementInst = newInst({ op: "increment", repeat });
  patch(body.out, increment);
  repeat.bodyStart = body.start;
  return { start: repeat, out: [{ inst: repeat, slot: "next" }] };
}

// Whether a quantifier is greedy or lazy only affects which substring a capturing group would
// record — irrelevant here, since buildProfileMatcher only ever asks "does the whole field match"
// (see matchFull). So greedy and lazy compile identically; `q.greedy` is parsed but never consulted.
function compileQuant(q: QuantNode): Frag {
  if (q.max === Infinity) {
    if (q.min === 0) return starFrag(q.atom);
    if (q.min <= UNROLL_THRESHOLD) return concat(repeatFrag(q.atom, q.min - 1), plusFrag(q.atom));
    return compileCountedRepeat(q.atom, q.min, Infinity);
  }
  if (q.min <= UNROLL_THRESHOLD && q.max - q.min <= UNROLL_THRESHOLD) {
    const optionals: Frag[] = [];
    for (let copy = q.min; copy < q.max; copy++) optionals.push(optionalFrag(q.atom));
    return concat(repeatFrag(q.atom, q.min), concatAll(optionals));
  }
  return compileCountedRepeat(q.atom, q.min, q.max);
}

function compileSeq(seq: SeqNode): Frag {
  return concatAll(seq.atoms.map(compileQuant));
}

function compileAlt(alt: AltNode): Frag {
  return alt.options.map(compileSeq).reduceRight((rest, option) => {
    const split: SplitInst = newInst({ op: "split" });
    split.next = option.start;
    split.next2 = rest.start;
    return { start: split, out: [...option.out, ...rest.out] };
  });
}

function compileProgram(alt: AltNode): Inst {
  instructionCount = 0;
  nextRepeatId = 0;
  repeatsById = [];
  const frag = compileAlt(alt);
  const matchInst: MatchInst = newInst({ op: "match" });
  patch(frag.out, matchInst);
  return frag.start;
}

// A backstop, not the primary defense against slow matching — compileCountedRepeat is, since it
// keeps a large bound's matching cost independent of the bound itself. What's left for this budget
// to catch: several moderate constructs compounding within one pattern, or anything unforeseen.
// It's generous — matching a large bound against a value that size measures in the tens of
// thousands of steps (see new-tab-menu.test.ts), so this is headroom, not a tight fit.
const MAX_MATCH_STEPS = 1000000;
type StepBudget = { remaining: number };

// A live NFA thread: which instruction it's at, plus the counter compileCountedRepeat's `repeat`/
// `increment` instructions read and write. `countFor` names which `repeat` instruction `count`
// belongs to — a thread not currently inside a counted repeat carries a `countFor` that matches no
// real instruction, so `repeat` treats it as a fresh entry (see the "repeat" case in addThread).
type Thread = { inst: Inst; count: number; countFor: number };
const NO_REPEAT = -1;

// \b sits between a word character and a non-word one, counting the space off either end of the
// value as non-word — so it holds at both ends of "PowerShell" but not inside it.
const isWordChar = (ch: string | undefined) => ch !== undefined && /\w/.test(ch);

function isWordBoundary(str: string, pos: number): boolean {
  return isWordChar(str[pos - 1]) !== isWordChar(str[pos]);
}

// Instructions outside any counted repeat dedupe by identity alone (`plain`), same as before a
// large quantifier could compile without unrolling. Instructions reached *inside* one (`countFor`
// names which `repeat`) need `count` in the key too — see capForDedup for why capping it at that
// repeat's `min` is safe rather than just using it raw.
type VisitedState = { plain: Set<Inst>; scoped: Map<Inst, Set<number>> };

function newVisited(): VisitedState {
  return { plain: new Set(), scoped: new Map() };
}

// Once a thread has reached `min` reps of a counted repeat, every rep beyond that is behaviorally
// identical for reachability: `repeat` offers the exact same exit target and the exact same
// continue-into-body target regardless of the exact count, right up to (and including) `max` —
// forced exit at `max` reaches nothing that optional exit at `min` didn't already reach. So capping
// the count at `min` for dedup purposes loses no reachable state, while bounding how many times a
// nullable body (one that can match empty, e.g. (|a)) can loop back within a single position —
// without the cap, each loop reaches `repeat` at a new, never-before-seen count and dedup never
// kicks in, so a large `max` risks growing that unboundedly before a real character is consumed.
// Only called when thread.countFor !== NO_REPEAT (see hasVisited/markVisited), so there's always a
// real repeat to look up.
function capForDedup(thread: Thread): number {
  return Math.min(thread.count, repeatsById[thread.countFor].min);
}

function hasVisited(visited: VisitedState, thread: Thread): boolean {
  if (thread.countFor === NO_REPEAT) return visited.plain.has(thread.inst);
  return visited.scoped.get(thread.inst)?.has(capForDedup(thread)) ?? false;
}

function markVisited(visited: VisitedState, thread: Thread): void {
  if (thread.countFor === NO_REPEAT) {
    visited.plain.add(thread.inst);
    return;
  }
  let seen = visited.scoped.get(thread.inst);
  if (!seen) {
    seen = new Set();
    visited.scoped.set(thread.inst, seen);
  }
  seen.add(capForDedup(thread));
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
function addThread(
  list: Thread[],
  visited: VisitedState,
  start: Thread,
  pos: number,
  str: string,
  budget: StepBudget,
): void {
  const stack: Thread[] = [start];
  while (stack.length > 0) {
    if (budget.remaining-- <= 0) return;
    const thread = stack.pop()!;
    const inst = thread.inst;
    if (hasVisited(visited, thread)) continue;
    markVisited(visited, thread);
    const { count, countFor } = thread;
    if (inst.op === "split") {
      stack.push({ inst: inst.next2!, count, countFor }, { inst: inst.next!, count, countFor });
    } else if (inst.op === "nop") {
      stack.push({ inst: inst.next!, count, countFor });
    } else if (inst.op === "start") {
      if (pos === 0) stack.push({ inst: inst.next!, count, countFor });
    } else if (inst.op === "end") {
      if (pos === str.length) stack.push({ inst: inst.next!, count, countFor });
    } else if (inst.op === "boundary") {
      if (isWordBoundary(str, pos) !== inst.negate) stack.push({ inst: inst.next!, count, countFor });
    } else if (inst.op === "repeat") {
      // A thread not already inside this repeat (countFor doesn't match) is entering fresh, at 0.
      const reps = countFor === inst.id ? count : 0;
      if (reps < inst.min) {
        // Below the minimum: another rep is mandatory, no option to stop yet.
        stack.push({ inst: inst.bodyStart, count: reps, countFor: inst.id });
      } else if (inst.max === Infinity || reps < inst.max) {
        // Within range: try one more rep, but stopping here is also valid (mirrors optionalFrag).
        stack.push({ inst: inst.next!, count, countFor });
        stack.push({ inst: inst.bodyStart, count: reps, countFor: inst.id });
      } else {
        // At the maximum: no more reps allowed.
        stack.push({ inst: inst.next!, count, countFor });
      }
    } else if (inst.op === "increment") {
      stack.push({ inst: inst.repeat, count: count + 1, countFor: inst.repeat.id });
    } else {
      list.push(thread);
    }
  }
}

// Runs the compiled NFA over `str` breadth-first, one input position at a time (Pike's VM) instead
// of recursing per character the way a backtracking engine would. Every thread advances together, so
// the call stack never grows with the length of `str` or with the pattern's backtracking search
// space — a 2,000-character value and a pathological pattern like (a+)+ cost the same handful of
// stack frames as a one-character match. Work per position is bounded by the pattern's compiled
// size — kept independent of any quantifier's bound by compileCountedRepeat — so nothing can blow
// up exponentially or scale with a large bound; MAX_MATCH_STEPS is a backstop for what's left.
function matchFull(prog: Inst, str: string): boolean {
  const budget: StepBudget = { remaining: MAX_MATCH_STEPS };
  let current: Thread[] = [];
  addThread(current, newVisited(), { inst: prog, count: 0, countFor: NO_REPEAT }, 0, str, budget);

  for (let pos = 0; pos < str.length; pos++) {
    if (current.length === 0) return false;
    const next: Thread[] = [];
    const visited = newVisited();
    const ch = str[pos];
    for (const thread of current) {
      if (budget.remaining-- <= 0) return false;
      const inst = thread.inst;
      const { count, countFor } = thread;
      if (inst.op === "char" && inst.test(ch))
        addThread(next, visited, { inst: inst.next!, count, countFor }, pos + 1, str, budget);
      else if (inst.op === "any") addThread(next, visited, { inst: inst.next!, count, countFor }, pos + 1, str, budget);
    }
    current = next;
  }

  return current.some((thread) => thread.inst.op === "match");
}

// A matchProfiles entry matches a profile when ANY provided field (name/commandline/source)
// fully matches that field's regex — mirrors Windows Terminal's MatchProfilesEntry. Empty profile
// fields never match, so "source": ".*" skips local profiles and "commandline": ".*" skips
// profiles without a command line. An entry with no patterns, a regex that is malformed or
// unsupported, one too large to compile, or one whose match against a particular value runs past
// MAX_MATCH_STEPS, all resolve the same way: that value doesn't match, rather than crashing or
// matching everything.
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
