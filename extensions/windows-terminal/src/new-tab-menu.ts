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
// (dev|prod)+, still matches normally, and so does (a+)+. A large bounded quantifier, like
// (a|b){0,4000} or (|a){2,4000}, is unbounded in practice too — compileCountedRepeat gives it a
// counter instead of unrolling it, so the compiled size doesn't grow with the bound.
//
// What the engine can't do, it says so: a construct it doesn't implement, a pattern too large to
// compile, or a match that runs past MAX_MATCH_STEPS all throw UnsupportedPatternError out of
// buildProfileMatcher, so the caller can tell "this profile doesn't match" from "this pattern
// couldn't be evaluated" and say so instead of quietly dropping profiles from the menu.
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

// A malformed pattern — one Windows Terminal's own regex engine would reject too, so the entry
// matches nothing there as well.
class RegexSyntaxError extends Error {}
// A pattern that's valid for Windows Terminal but that this engine can't evaluate: a construct it
// doesn't implement, one too large to compile, or a match that runs past MAX_MATCH_STEPS.
export class UnsupportedPatternError extends Error {}

// compileQuant unrolls a *small* {n,m} into that many copies of the atom — cheap, and it's what
// lets a bounded quantifier nest freely inside another (e.g. (a?)*). A *large* bound instead
// compiles through compileCountedRepeat, a single shared instruction the matcher's thread carries
// a counter through, so the compiled size and matching cost stay independent of how big the bound
// is (see MAX_MATCH_STEPS). This cap remains as a backstop against structural blowup unrelated to
// quantifier size — e.g. an alternation with an implausible number of branches.
const MAX_PROGRAM_SIZE = 50000;

// Below this, compileQuant unrolls a {n,m} into that many literal copies (cheap); at or above it,
// compileCountedRepeat is used instead, and the compiled size no longer scales with the bound. A
// counted repeat can't nest inside another one, so inside its body every quantifier unrolls
// regardless of size (see insideCountedRepeat).
const UNROLL_THRESHOLD = 20;

// ICU's character classes, not JavaScript's ASCII-only ones — Windows Terminal matches with ICU,
// where \w covers letters, marks, decimal digits, and connector punctuation in any script
// ("Développement"), \d any script's decimal digits ("١٢٣"), \s is [\t\n\f\r\p{Z}], and \b is
// defined in terms of that \w ("\bÉquipe\b"). Values and patterns are walked by code point, not
// UTF-16 code unit, so "." consumes all of "🚀" — and, as in ICU without its DOTALL flag, "."
// stops at a line terminator.
const isWordChar = (ch: string) => /[\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\p{Join_Control}]/u.test(ch);
const isDigit = (ch: string) => /\p{Nd}/u.test(ch);
const isSpace = (ch: string) => /[\t\n\f\r\p{Z}]/u.test(ch);
// U+000A-U+000D, U+0085, U+2028, U+2029 — ICU's line terminators (spelled as code points: U+2028/9 are
// line separators, and a literal one would end the regex line it sits on).
const LINE_TERMINATORS = new Set([0x0a, 0x0b, 0x0c, 0x0d, 0x85, 0x2028, 0x2029]);
const isLineTerminator = (ch: string) => LINE_TERMINATORS.has(ch.codePointAt(0)!);

// Parses the subset of ICU regex syntax (the flavor Windows Terminal itself matches with) that
// matchProfiles patterns actually use: literals, `.`, escapes (`\d\w\s` and their negations, `\.`
// etc.), the `\b`/`\B` word-boundary assertions, `[...]` classes, `(...)`/`(?:...)` groups, the
// `(?i)`/`(?i:...)` case-insensitivity flag, `|` alternation, and `* + ? {n,m}` quantifiers (with
// lazy `?` variants). Anything else — lookaround, backreferences, unicode property escapes — is
// unsupported and throws UnsupportedPatternError; a malformed pattern throws RegexSyntaxError.
function parsePattern(pattern: string): AltNode {
  let i = 0;
  const chars = Array.from(pattern);
  const n = chars.length;
  const peek = () => chars[i];
  const rest = () => chars.slice(i).join("");
  const fail = (msg: string): never => {
    throw new RegexSyntaxError(msg);
  };
  const unsupported = (msg: string): never => {
    throw new UnsupportedPatternError(msg);
  };

  // Set by (?i) and restored when the enclosing group closes, mirroring ICU: the flag runs from
  // where it appears to the end of that group, subsequent `|` branches included. It's applied as
  // each character test is built, so the compiled program needs no notion of case at all.
  let ignoreCase = false;
  // parseAtom recurses into parseAlt for every "(" — this bounds that recursion, since the parser
  // (unlike matchFull's explicit-stack VM) has no other stack-safety guard. Nothing near this depth
  // is a realistic matchProfiles pattern; it exists so a pathologically deep one is reported as
  // unsupported, like any other construct past this engine's limits, instead of overflowing the
  // call stack.
  let groupDepth = 0;
  const MAX_GROUP_DEPTH = 100;
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
      const braces = /^\{(\d+)(,(\d*))?\}/.exec(rest());
      if (braces) {
        min = parseInt(braces[1], 10);
        max = braces[2] === undefined ? min : braces[3] === "" ? Infinity : parseInt(braces[3], 10);
        // A bound with enough digits overflows parseInt to Infinity, which would pass the
        // "max < min" check below (Infinity < Infinity is false) as if it were a legitimate
        // unbounded {n,}. Checked on the parsed value, not the digit-string length, so a
        // zero-padded bound like {0000000005,10} isn't wrongly rejected as "too large" — no real
        // matchProfiles pattern needs a bound anywhere near this size either way.
        if (min > 1e9 || (max !== Infinity && max > 1e9)) return unsupported("quantifier bound too large");
        if (max < min) return fail("quantifier bounds out of order");
        quantified = true;
        i += braces[0].length;
      }
    }
    // Windows Terminal's regex engine rejects a quantified anchor (^?, $*, ^{2}...) as a syntax
    // error rather than matching it literally or ignoring the quantifier, so mirror that here —
    // \b/\B are zero-width assertions too, so without this a quantifier's always-valid zero-rep
    // path (e.g. starFrag) would silently accept \b* without the assertion ever holding.
    if (quantified && (atom.kind === "start" || atom.kind === "end" || atom.kind === "boundary")) {
      return fail("quantified anchor");
    }
    // ICU's possessive quantifiers (a++, a*+, a?+, a{2}+) aren't implemented — and a "+" right
    // after a quantifier means exactly that there, so it can't be left to read as a stray "+" and
    // be reported as malformed.
    if (quantified && peek() === "+") return unsupported("possessive quantifier not implemented");
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
        const modifier = /^\?(-?)(i*)([:)])/.exec(rest());
        if (!modifier) return unsupported("group modifier not implemented");
        const [consumed, disable, flags, delimiter] = modifier;
        if (flags === "" && delimiter === ")") return fail("empty inline flags");
        if (flags !== "") ignoreCase = disable !== "-";
        i += consumed.length;
        // (?i) is a switch, not a group: it matches nothing itself, and deliberately leaves
        // ignoreCase set for whatever follows it in the enclosing group.
        if (delimiter === ")") return { kind: "group", alt: { options: [{ atoms: [] }] } };
      }
      if (++groupDepth > MAX_GROUP_DEPTH) return unsupported("pattern nested too deeply");
      const alt = parseAlt();
      groupDepth--;
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
    d: isDigit,
    D: (ch) => !isDigit(ch),
    w: isWordChar,
    W: (ch) => !isWordChar(ch),
    s: isSpace,
    S: (ch) => !isSpace(ch),
  };

  function parseEscape(): AtomNode {
    const c = chars[i];
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
    if (/[A-Za-z0-9]/.test(c)) return unsupported(`escape "\\${c}" not implemented`);
    return charAtom((ch) => ch === c);
  }

  // Reads one position inside a class: either a literal character (plain, or an escaped one like
  // \- or \]) that can potentially anchor a range, or a multi-character escape predicate (\d, \w,
  // \s, or a negation) that can't — \d-9 has no meaningful "range from a whole digit class".
  type ClassAtom = { literal: string } | { predicate: (ch: string) => boolean };
  function parseClassAtom(): ClassAtom {
    const c = chars[i];
    if (c !== "\\") {
      i++;
      return { literal: c };
    }
    i++;
    const esc = chars[i];
    i++;
    if (esc === undefined) return fail("trailing backslash");
    const predicate = escapePredicates[esc];
    if (predicate !== undefined) return { predicate };
    if (/[A-Za-z0-9]/.test(esc)) return unsupported(`escape "\\${esc}" not implemented`);
    return { literal: esc };
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
      // ICU reads an unescaped "[" inside a set as a nested set ([[:alpha:]], [a-z[0-9]]) and "&&"
      // as set intersection ([a-z&&[^m]]). Neither is implemented; reading them as literals would
      // quietly match the wrong profiles, so report them instead.
      if (peek() === "[") return unsupported("nested character set not implemented");
      if (peek() === "&" && chars[i + 1] === "&") return unsupported("character set intersection not implemented");
      const startAtom = parseClassAtom();
      if ("predicate" in startAtom) {
        tests.push(startAtom.predicate);
        continue;
      }
      const start = startAtom.literal;
      if (peek() === "-" && chars[i + 1] !== "]" && i + 1 < n) {
        i++; // consume "-"
        const endAtom = parseClassAtom();
        if ("predicate" in endAtom) return fail("a character class can't end a range");
        const end = endAtom.literal;
        // A descending range like [z-a] can never match anything; real regex engines reject it
        // as malformed rather than silently compiling a predicate that's always false.
        if (end < start) return fail(`character range "${start}-${end}" out of order`);
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
// each rep instead of being duplicated per rep — see compileCountedRepeat and the `lo`/`hi`/
// `countFor` fields threads carry through addThread/matchFull.
type RepeatInst = { op: "repeat"; min: number; max: number; bodyStart: Inst; next?: Inst };
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
// /Thompson NFA instruction types

// Every instruction is created through here, so the running total covers nested unrolling too —
// e.g. small quantifiers nested several levels deep, each individually under UNROLL_THRESHOLD but
// multiplying together — and compilation gives up partway through rather than after building the
// whole oversized program.
let instructionCount = 0;

function newInst<T extends Inst>(inst: T): T {
  if (++instructionCount > MAX_PROGRAM_SIZE) throw new UnsupportedPatternError("pattern is too large to compile");
  return inst;
}

// True while compileCountedRepeat compiles its body. A thread carries a single counter (see
// Thread), so it can't track two counted repeats at once — every quantifier inside the body
// unrolls instead, whatever its size, and stays plain instructions the outer count passes through
// untouched. That's how (a{21}){21} or ((a|b){200}){200} compile; MAX_PROGRAM_SIZE still bounds
// how large the unrolled body can get.
let insideCountedRepeat = false;

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

// Compiles a single, unquantified atom into a one-instruction (or, for a group, sub-program) Frag.
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

// Whether compileQuant sends this quantifier through compileCountedRepeat (a large bound) rather
// than unrolling it (a small one) — the one place that decision lives.
function usesCounter(q: QuantNode): boolean {
  if (q.max === Infinity) return q.min > UNROLL_THRESHOLD;
  return q.min > UNROLL_THRESHOLD || q.max - q.min > UNROLL_THRESHOLD;
}

// Whether `atom` matches the empty string unconditionally — an empty alternative, or one made only
// of optional atoms. Anchors and \b don't count: they're zero-width but conditional on position.
function isNullable(atom: AtomNode): boolean {
  if (atom.kind !== "group") return false;
  return atom.alt.options.some((seq) => seq.atoms.every((q) => q.min === 0 || isNullable(q.atom)));
}

// Compiles atom{min,max} (max possibly Infinity) as one `repeat` instruction plus one copy of the
// atom's body, instead of unrolling — see the `repeat`/`increment` handling in addThread for how a
// thread's counter takes the place of the copies compileQuant's other branch would otherwise make.
// The body can be anything — nullable alternatives like (|a), differently-sized ones like (a|aa),
// another quantifier (unrolled, see insideCountedRepeat) — because the matcher tracks exactly
// which counts have reached each instruction (see Thread and VisitedState), never assuming reps
// line up with string positions.
function compileCountedRepeat(atom: AtomNode, min: number, max: number): Frag {
  // A body that can always match empty makes `min` meaningless — any shortfall is made up with
  // empty reps at no cost — so (|a){3000,4000} accepts exactly what (|a){0,4000} does. Compiling
  // it as the latter matters for cost, not just tidiness: a nullable body climbs through every
  // count below `min` at every single position, one closure step each.
  if (isNullable(atom)) min = 0;
  const repeat: RepeatInst = newInst({ op: "repeat", min, max, bodyStart: undefined as unknown as Inst });
  insideCountedRepeat = true;
  let body: Frag;
  try {
    body = compileAtom(atom);
  } finally {
    insideCountedRepeat = false;
  }
  const increment: IncrementInst = newInst({ op: "increment", repeat });
  patch(body.out, increment);
  repeat.bodyStart = body.start;
  return { start: repeat, out: [{ inst: repeat, slot: "next" }] };
}

// Whether a quantifier is greedy or lazy only affects which substring a capturing group would
// record — irrelevant here, since buildProfileMatcher only ever asks "does the whole field match"
// (see matchFull). So greedy and lazy compile identically; `q.greedy` is parsed but never consulted.
function compileQuant(q: QuantNode): Frag {
  if (!insideCountedRepeat && usesCounter(q)) return compileCountedRepeat(q.atom, q.min, q.max);
  if (q.max === Infinity) {
    if (q.min === 0) return starFrag(q.atom);
    return concat(repeatFrag(q.atom, q.min - 1), plusFrag(q.atom));
  }
  const optionals: Frag[] = [];
  for (let copy = q.min; copy < q.max; copy++) optionals.push(optionalFrag(q.atom));
  return concat(repeatFrag(q.atom, q.min), concatAll(optionals));
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
  insideCountedRepeat = false;
  const frag = compileAlt(alt);
  const matchInst: MatchInst = newInst({ op: "match" });
  patch(frag.out, matchInst);
  return frag.start;
}

// A backstop, not the primary defense against slow matching — compileCountedRepeat and the count
// ranges threads carry (see Thread) are, since together they keep a large bound's matching cost
// independent of the bound itself. What's left for this budget to catch: several moderate
// constructs compounding within one pattern, or anything unforeseen. Running out of it throws
// UnsupportedPatternError rather than reporting "no match" — the two mean different things to the
// menu. It's generous: matching a large bound against a value that size measures in the tens of
// thousands of steps (see new-tab-menu.test.ts), so this is headroom, not a tight fit.
const MAX_MATCH_STEPS = 1000000;
type StepBudget = { remaining: number };

function spend(budget: StepBudget): void {
  if (budget.remaining-- <= 0) throw new UnsupportedPatternError("matching it takes too many steps");
}

// A live NFA thread: which instruction it's at, plus the counter compileCountedRepeat's `repeat`/
// `increment` instructions read and write. `countFor` names which `repeat` instruction the counter
// belongs to, as a direct reference (not an id looked up in shared state — a `matchProfiles` entry
// compiles one program per field, and a lookup table reset by each compile would leave an earlier
// field's threads reading another field's repeat metadata once all fields are later matched). A
// thread not currently inside a counted repeat carries a `countFor` of null, so `repeat` treats it
// as a fresh entry (see the "repeat" case in addThread).
//
// The counter is a range, `lo`..`hi` inclusive, not one number: every count in it has reached this
// instruction at this position, and one thread stands in for all of them (see enqueue). Nothing
// less keeps ".*a{1000,4000}" linear — the `.*` enters the repeat at every position, so at
// position p the body is live with every count from 0 to p, and counts below `min` can't be pruned
// against each other: a lower one still has more mandatory reps ahead, a higher one has less room
// before `max`, so neither can stand in for the other. Kept as one range, they cost one thread —
// when they're contiguous. A body whose alternatives differ in width by 2 or more, like (a|aaa),
// reaches counts with gaps between them that no merge can close, so below `min` those stay
// separate threads and the cost is back to O(length × min). That shape is what MAX_MATCH_STEPS is
// still there to catch, and it fails visibly (see spend) rather than as a non-match.
type Thread = { inst: Inst; lo: number; hi: number; countFor: RepeatInst | null };
const NO_REPEAT = null;

// What's already been queued at the current string position. Instructions outside any counted
// repeat dedupe by identity alone (`plain`). Instructions reached *while inside* one are keyed by
// their exact count range too (`scoped`): the same instruction at the same position with different
// counts is a genuinely different state, because the count decides how many more reps are still
// mandatory (below `min`) or still allowed (up to `max`). Nothing about the body is assumed — a
// prefix like (?:x|xa) can enter the repeat at two different positions, so two threads with
// different counts legitimately share an instruction at every later position, and collapsing
// them onto one key (as an earlier "cap the count at min" key did) silently drops the one that
// could still reach `max`.
//
// Two prunings ARE sound on top of that. `lowestSettled`: once a count is at or above `min`, a
// lower such count can do everything a higher one can (exit now, or keep going — for longer), so
// it records the lowest count ≥ min queued at each instruction and any count above it is dropped.
// That's what keeps ".*a{0,12000}" from carrying every possible count along at every position.
// `queued`: the threads already waiting at each consuming instruction, so a range that touches or
// overlaps one of them merges into it (see enqueue) instead of queuing separately — the ranges
// that make ".*a{1000,4000}" linear are built here, one merge per position.
type VisitedState = {
  plain: Set<Inst>;
  scoped: Map<Inst, Set<string>>;
  lowestSettled: Map<Inst, number>;
  queued: Map<Inst, Thread[]>;
};

function newVisited(): VisitedState {
  return { plain: new Set(), scoped: new Map(), lowestSettled: new Map(), queued: new Map() };
}

// Records the thread at this position and returns what's left of it to explore — its range trimmed
// of counts `lowestSettled` makes redundant — or null if it adds nothing new.
function visit(visited: VisitedState, thread: Thread): Thread | null {
  const { inst, countFor } = thread;
  if (countFor === NO_REPEAT) {
    if (visited.plain.has(inst)) return null;
    visited.plain.add(inst);
    return thread;
  }
  const { lo } = thread;
  let { hi } = thread;
  const lowest = visited.lowestSettled.get(inst);
  if (lowest !== undefined && lowest <= hi) {
    if (lowest <= lo) return null;
    hi = lowest - 1;
  }
  let seen = visited.scoped.get(inst);
  if (!seen) {
    seen = new Set();
    visited.scoped.set(inst, seen);
  }
  const key = `${lo},${hi}`;
  if (seen.has(key)) return null;
  seen.add(key);
  // Anything ≥ min in this range is at most `lowest` - 1 (trimmed above), so this only ever lowers it.
  if (hi >= countFor.min) visited.lowestSettled.set(inst, Math.max(lo, countFor.min));
  return { inst, lo, hi, countFor };
}

// Queues a thread at a consuming instruction for the next position, merging its count range into a
// thread already queued there when the two touch or overlap (see VisitedState.queued). Threads
// outside a counted repeat have nothing to merge — `plain` already dedupes them by instruction.
function enqueue(list: Thread[], visited: VisitedState, thread: Thread): void {
  if (thread.countFor !== NO_REPEAT) {
    let queued = visited.queued.get(thread.inst);
    if (!queued) {
      queued = [];
      visited.queued.set(thread.inst, queued);
    }
    const neighbor = queued.find((other) => thread.lo <= other.hi + 1 && other.lo <= thread.hi + 1);
    if (neighbor) {
      neighbor.lo = Math.min(neighbor.lo, thread.lo);
      neighbor.hi = Math.max(neighbor.hi, thread.hi);
      return;
    }
    queued.push(thread);
  }
  list.push(thread);
}

// \b sits between a word character and a non-word one, counting the space off either end of the
// value as non-word — so it holds at both ends of "PowerShell" but not inside it.
function isWordBoundary(chars: string[], pos: number): boolean {
  const before = pos > 0 && isWordChar(chars[pos - 1]);
  const after = pos < chars.length && isWordChar(chars[pos]);
  return before !== after;
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
  chars: string[],
  budget: StepBudget,
): void {
  const stack: Thread[] = [start];
  while (stack.length > 0) {
    spend(budget);
    const thread = visit(visited, stack.pop()!);
    if (!thread) continue;
    const { inst, lo, hi, countFor } = thread;
    if (inst.op === "split") {
      stack.push({ inst: inst.next2!, lo, hi, countFor }, { inst: inst.next!, lo, hi, countFor });
    } else if (inst.op === "nop") {
      stack.push({ inst: inst.next!, lo, hi, countFor });
    } else if (inst.op === "start") {
      if (pos === 0) stack.push({ inst: inst.next!, lo, hi, countFor });
    } else if (inst.op === "end") {
      if (pos === chars.length) stack.push({ inst: inst.next!, lo, hi, countFor });
    } else if (inst.op === "boundary") {
      if (isWordBoundary(chars, pos) !== inst.negate) stack.push({ inst: inst.next!, lo, hi, countFor });
    } else if (inst.op === "repeat") {
      // A thread not already inside this repeat (countFor doesn't match) is entering fresh, at 0.
      const [from, to] = countFor === inst ? [lo, hi] : [0, 0];
      // Any count at or above the minimum may stop here (mirrors optionalFrag). Exiting resets the
      // counter to NO_REPEAT — carrying this repeat's counter past `next` would let it reach a
      // later, unrelated `repeat` instruction still tagged as "inside" this one, corrupting that
      // instruction's own dedup key and reps count.
      if (to >= inst.min) stack.push({ inst: inst.next!, lo: 0, hi: 0, countFor: NO_REPEAT });
      // Any count below the maximum may run the body again — and of those at or above the
      // minimum, only the lowest is worth keeping (see VisitedState.lowestSettled).
      const again = Math.min(to, inst.max - 1, Math.max(from, inst.min));
      if (from <= again) stack.push({ inst: inst.bodyStart, lo: from, hi: again, countFor: inst });
    } else if (inst.op === "increment") {
      stack.push({ inst: inst.repeat, lo: lo + 1, hi: hi + 1, countFor: inst.repeat });
    } else {
      enqueue(list, visited, thread);
    }
  }
}
// /addThread

// Runs the compiled NFA over `str` breadth-first, one input position at a time (Pike's VM) instead
// of recursing per character the way a backtracking engine would. Every thread advances together, so
// the call stack never grows with the length of `str` or with the pattern's backtracking search
// space — a 2,000-character value and a pathological pattern like (a+)+ cost the same handful of
// stack frames as a one-character match. Work per position is bounded by the pattern's compiled
// size times the distinct repeat count ranges still alive there (see VisitedState) — for any
// realistic pattern that's a handful — so nothing can blow up exponentially; MAX_MATCH_STEPS is a
// backstop for what's left, and running out of it throws rather than answering "no match".
function matchFull(prog: Inst, str: string): boolean {
  const budget: StepBudget = { remaining: MAX_MATCH_STEPS };
  // One element per code point, so a surrogate pair like "🚀" is one character to the matcher.
  const chars = Array.from(str);
  let current: Thread[] = [];
  addThread(current, newVisited(), { inst: prog, lo: 0, hi: 0, countFor: NO_REPEAT }, 0, chars, budget);

  for (let pos = 0; pos < chars.length; pos++) {
    if (current.length === 0) return false;
    const next: Thread[] = [];
    const visited = newVisited();
    const ch = chars[pos];
    // Lowest count first, so a thread that dominates (see VisitedState.lowestSettled) is always
    // queued before the ones it makes redundant. The closure explores a body's first alternative
    // first, and for something like (a|aa){21,4000} that's the higher-count path — left in that
    // order, every count would survive at every position and the budget would run out on a
    // perfectly ordinary long value. Counts only ever grow by one per `increment` or reset to
    // zero on exit, so sorting here keeps that dominance order through the whole step.
    current.sort((a, b) => a.lo - b.lo);
    for (const thread of current) {
      spend(budget);
      const { inst, lo, hi, countFor } = thread;
      if (inst.op === "char" && inst.test(ch))
        addThread(next, visited, { inst: inst.next!, lo, hi, countFor }, pos + 1, chars, budget);
      else if (inst.op === "any" && !isLineTerminator(ch))
        addThread(next, visited, { inst: inst.next!, lo, hi, countFor }, pos + 1, chars, budget);
    }
    current = next;
  }

  return current.some((thread) => thread.inst.op === "match");
}
// /matchFull

// A matchProfiles entry matches a profile when ANY provided field (name/commandline/source)
// fully matches that field's regex — mirrors Windows Terminal's MatchProfilesEntry. Empty profile
// fields never match, so "source": ".*" skips local profiles and "commandline": ".*" skips
// profiles without a command line. An entry with no patterns, or with a malformed regex, matches
// nothing (returns null) — Windows Terminal rejects those too. A pattern that's valid there but
// that this engine can't evaluate is different: it throws UnsupportedPatternError, naming the
// pattern, either here (a construct not implemented, or too large to compile) or from the returned
// matcher (a match that runs past MAX_MATCH_STEPS), so the caller can say so rather than showing
// an order that silently leaves profiles out.
export function buildProfileMatcher(entry: NewTabMenuEntry): ((profile: Profile) => boolean) | null {
  const specs: { pattern: string; get: (profile: Profile) => string }[] = [];
  if (entry.name !== undefined) specs.push({ pattern: entry.name, get: (p) => p.name });
  if (entry.commandline !== undefined) specs.push({ pattern: entry.commandline, get: (p) => p.commandline ?? "" });
  if (entry.source !== undefined) specs.push({ pattern: entry.source, get: (p) => p.source ?? "" });
  if (specs.length === 0) return null;

  const unsupported = (pattern: string, error: unknown): never => {
    if (error instanceof UnsupportedPatternError) {
      throw new UnsupportedPatternError(`Can't evaluate the matchProfiles pattern "${pattern}": ${error.message}`);
    }
    throw error;
  };

  let matchers: { pattern: string; prog: Inst; get: (profile: Profile) => string }[];
  try {
    matchers = specs.map(({ pattern, get }) => {
      try {
        return { pattern, prog: compileProgram(parsePattern(pattern)), get };
      } catch (error) {
        return unsupported(pattern, error);
      }
    });
  } catch (error) {
    if (error instanceof RegexSyntaxError) return null;
    throw error;
  }

  return (profile: Profile) =>
    matchers.some(({ pattern, prog, get }) => {
      const value = get(profile);
      if (value.length === 0) return false;
      try {
        return matchFull(prog, value);
      } catch (error) {
        return unsupported(pattern, error);
      }
    });
}

// Mirrors Windows Terminal's own newTabMenu resolution (CascadiaSettingsSerialization.cpp):
// two passes over the tree. Pass 1 collects every profile referenced by a "profile" or
// "matchProfiles" entry anywhere (including inside folders). Pass 2 walks the tree again to
// build the final order — "remainingProfiles" expands to profiles NOT in that pass-1 set, at
// the position it appears, so a later explicit reference still lands after the remainder.
// A matchProfiles pattern this extension can't evaluate throws UnsupportedPatternError out of
// here (see buildProfileMatcher) — an order computed without it would be wrong, not just partial.
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
