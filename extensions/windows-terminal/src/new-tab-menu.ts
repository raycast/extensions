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

// A minimal backtracking regex engine, used instead of JavaScript's native RegExp. Native regex
// matching can't be interrupted once it starts, so a pathological pattern — (a+)+, (a?a?)+,
// ((ab)+)+ — would freeze the profile list while it renders. This engine bounds itself with a
// step counter instead: every recursive attempt costs one step, and once the budget is spent the
// match fails rather than exploring further. That makes ALL patterns safe to run, including ones
// that look risky, so nothing needs to be rejected up front — a repeated group with safe
// alternatives, like (dev|prod)+, still matches normally.
type AtomNode = { kind: "char"; test: (ch: string) => boolean } | { kind: "any" } | { kind: "group"; alt: AltNode };
type QuantNode = { atom: AtomNode; min: number; max: number; greedy: boolean };
type SeqNode = { atoms: QuantNode[] };
type AltNode = { options: SeqNode[] };

class RegexSyntaxError extends Error {}

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
    const c = peek();
    if (c === "*") {
      min = 0;
      max = Infinity;
      i++;
    } else if (c === "+") {
      min = 1;
      max = Infinity;
      i++;
    } else if (c === "?") {
      min = 0;
      max = 1;
      i++;
    } else if (c === "{") {
      const braces = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
      if (braces) {
        min = parseInt(braces[1], 10);
        max = braces[2] === undefined ? min : braces[3] === "" ? Infinity : parseInt(braces[3], 10);
        i += braces[0].length;
      }
    }
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
        else if (esc === "w") tests.push((ch) => /\w/.test(ch));
        else if (esc === "s") tests.push((ch) => /\s/.test(ch));
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

// Every recursive attempt below — descending into a group, trying one more quantifier repeat,
// trying an alternation branch — spends one step. Legitimate matchProfiles patterns against
// profile-sized strings need at most a few hundred; this budget leaves headroom for that while
// still cutting off exponential blowups almost immediately.
const STEP_BUDGET = 2000;

// Continuation-passing backtracking matcher, fully anchored (matches only if it consumes the
// whole string). `k` is "what to try once this piece has matched"; quantifiers try repeating
// (greedy) or stopping (lazy) first, per their `greedy` flag, and fall back to the other on
// failure — same shape as a native regex engine, just with a hard step ceiling.
function matchFull(alt: AltNode, str: string): boolean {
  let steps = 0;
  const withinBudget = () => ++steps <= STEP_BUDGET;

  function matchAtomOnce(atom: AtomNode, pos: number, k: (pos: number) => boolean): boolean {
    if (!withinBudget()) return false;
    if (atom.kind === "char") return pos < str.length && atom.test(str[pos]) && k(pos + 1);
    if (atom.kind === "any") return pos < str.length && k(pos + 1);
    return matchAlt(atom.alt, pos, k);
  }

  function matchQuant(q: QuantNode, pos: number, k: (pos: number) => boolean): boolean {
    function attempt(count: number, p: number): boolean {
      if (!withinBudget()) return false;
      const tryMore = () => count < q.max && matchAtomOnce(q.atom, p, (np) => attempt(count + 1, np));
      const tryStop = () => count >= q.min && k(p);
      return q.greedy ? tryMore() || tryStop() : tryStop() || tryMore();
    }
    return attempt(0, pos);
  }

  function matchSeq(atoms: QuantNode[], idx: number, pos: number, k: (pos: number) => boolean): boolean {
    if (!withinBudget()) return false;
    if (idx === atoms.length) return k(pos);
    return matchQuant(atoms[idx], pos, (np) => matchSeq(atoms, idx + 1, np, k));
  }

  function matchAlt(alt: AltNode, pos: number, k: (pos: number) => boolean): boolean {
    if (!withinBudget()) return false;
    return alt.options.some((seq) => matchSeq(seq.atoms, 0, pos, k));
  }

  return matchAlt(alt, 0, (pos) => pos === str.length);
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

  let matchers: { alt: AltNode; get: (profile: Profile) => string }[];
  try {
    matchers = specs.map(({ pattern, get }) => ({ alt: parsePattern(pattern), get }));
  } catch {
    return null;
  }

  return (profile: Profile) =>
    matchers.some(({ alt, get }) => {
      const value = get(profile);
      return value.length > 0 && matchFull(alt, value);
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
