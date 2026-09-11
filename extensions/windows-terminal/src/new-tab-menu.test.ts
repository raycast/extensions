import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnsupportedPatternError, buildProfileMatcher, resolveNewTabMenuOrder } from "./new-tab-menu.ts";
import type { NewTabMenuEntry, Profile } from "./new-tab-menu.ts";

const powershell: Profile = { guid: "{p1}", name: "PowerShell", commandline: "pwsh.exe" };
const commandPrompt: Profile = { guid: "{p2}", name: "Command Prompt", commandline: "cmd.exe" };
const ubuntu: Profile = { guid: "{p3}", name: "Ubuntu", source: "Microsoft.WSL" };
const azure: Profile = { guid: "{p4}", name: "Azure Cloud Shell", source: "Windows.Terminal.Azure" };
const profiles = [powershell, commandPrompt, ubuntu, azure];

function matchedNames(entry: NewTabMenuEntry) {
  const matcher = buildProfileMatcher(entry);
  return matcher ? profiles.filter(matcher).map((p) => p.name) : null;
}

describe("buildProfileMatcher", () => {
  it("never matches an empty source", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", source: ".*" }), ["Ubuntu", "Azure Cloud Shell"]);
  });

  it("never matches an empty commandline", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: ".*" }), ["PowerShell", "Command Prompt"]);
  });

  it("matches the whole field, not a substring", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power" }), []);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power.*" }), ["PowerShell"]);
  });

  it("matches when any single field matches", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Nothing", source: "Microsoft.WSL" }), ["Ubuntu"]);
  });

  it("matches nothing without patterns or with a malformed regex", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[" }), null);
  });

  it("keeps patterns that only look nested", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(Power)+Shell" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?:Power|Command)\\s.*" }), ["Command Prompt"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: "[a-z]+\\.exe" }), [
      "PowerShell",
      "Command Prompt",
    ]);
  });

  it("keeps a repeated group whose alternatives are disjoint", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: "(pwsh|cmd)+\\.exe" }), [
      "PowerShell",
      "Command Prompt",
    ]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(a|b)+" }), []);
  });

  it("bounds pathological patterns instead of rejecting or hanging on them", () => {
    // (a+)+, (a?a?)+, ((ab)+)+, (a|aa)* all cause exponential backtracking in a native regex
    // engine. The matcher still builds (the pattern is valid syntax) and returns fast with no
    // match, instead of freezing or silently dropping a pattern that could otherwise be safe.
    const adversarialName = "a".repeat(40) + "!";
    for (const pattern of ["(a+)+", "(a?a?)+", "((ab)+)+", "(a|aa)*"]) {
      const start = Date.now();
      const matcher = buildProfileMatcher({ type: "matchProfiles", name: pattern });
      assert.notEqual(matcher, null, pattern);
      assert.equal(matcher!({ ...powershell, name: adversarialName }), false, pattern);
      assert.ok(Date.now() - start < 1000, `${pattern} took too long`);
    }
  });

  it("treats ^ and $ as anchors, not literal characters", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "^PowerShell$" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "^Power.*$" }), ["PowerShell"]);
  });

  it("rejects a quantified anchor, matching Windows Terminal's regex engine", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "^?PowerShell" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "PowerShell$?" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "^*PowerShell" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "^{2}PowerShell" }), null);
    // \b/\B are zero-width assertions too — a quantifier's always-valid zero-rep path would
    // otherwise silently accept \b* without the assertion ever actually holding.
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "a\\b*b" }), null);
  });

  it("rejects a character class range that's out of order", () => {
    // [z-a] can never match anything; reject it rather than silently compiling an always-false
    // predicate a config author would have no way to notice.
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[z-a]" }), null);
    // A properly-ordered range still works.
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: "[a-z]+\\.exe" }), [
      "PowerShell",
      "Command Prompt",
    ]);
  });

  it("forms a range from an escaped boundary character, not just a plain one", () => {
    // parseClassAtom resolves \- or \] to their literal character before the range check runs,
    // so an escaped boundary (needed for a char like "-" that can't appear unescaped there)
    // still participates in the range instead of silently becoming disjoint literals.
    assert.equal(
      buildProfileMatcher({ type: "matchProfiles", name: "[\\--9]+" })!({ ...powershell, name: "1.2.3" }),
      true,
    );
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[X-\\]]+" })!({ ...powershell, name: "]" }), true);
    // A multi-character escape (\d, \w, \s) can't anchor or end a range — there's no single
    // character to range from/to.
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[a-\\d]" }), null);
  });

  it("rejects a quantifier bound with an implausible number of digits", () => {
    // A 300+ digit bound overflows parseInt to Infinity, which would pass the "max < min"
    // ordering check (Infinity < Infinity is false) as if it were a legitimate {n,}. Checked on
    // the parsed value, not the digit-string length, so a zero-padded bound isn't wrongly
    // rejected as "too large" just for having a lot of leading zeros.
    assert.throws(
      () => buildProfileMatcher({ type: "matchProfiles", name: "a{" + "9".repeat(310) + "}" }),
      UnsupportedPatternError,
    );
    assert.notEqual(buildProfileMatcher({ type: "matchProfiles", name: "a{100000000}" }), null);
    assert.equal(
      buildProfileMatcher({ type: "matchProfiles", name: "a{0000000005,10}" })!({ ...powershell, name: "aaaaa" }),
      true,
    );
  });

  it("reports a pattern nested too deeply instead of overflowing the call stack", () => {
    const deep = "(".repeat(5000) + "a" + ")".repeat(5000);
    assert.throws(() => buildProfileMatcher({ type: "matchProfiles", name: deep }), UnsupportedPatternError);
    // A realistic amount of nesting still compiles fine.
    const shallow = "(".repeat(50) + "a" + ")".repeat(50);
    assert.notEqual(buildProfileMatcher({ type: "matchProfiles", name: shallow }), null);
  });

  it("matches a long linear value without excessive cost", () => {
    const longCommandline = "C:\\tools\\" + "a".repeat(1000) + ".exe";
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: "C:\\\\tools\\\\.*\\.exe" });
    assert.ok(matcher!({ ...powershell, commandline: longCommandline }));
  });

  it("doesn't overflow the call stack on a long value", () => {
    const longCommandline = "a".repeat(2000);
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: ".*" });
    assert.equal(matcher!({ ...powershell, commandline: longCommandline }), true);
  });

  it("doesn't let a zero-length repetition block the rest of the pattern", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "(a?)*b" });
    assert.equal(matcher!({ ...powershell, name: "b" }), true);
  });

  it("supports negated escape classes inside a bracket expression", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[\\D]+" })!(powershell), true);
  });

  it("doesn't overflow the call stack on a long flat run of optional atoms", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "a?".repeat(5000) + "b" });
    assert.equal(matcher!({ ...powershell, name: "b" }), true);
  });

  it("treats \\b and \\B as word boundaries, not literal letters", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "\\bPowerShell\\b" })!(powershell), true);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "\\bCommand\\b Prompt" }), ["Command Prompt"]);
    // There's no boundary mid-word, so \b can't split PowerShell between "Power" and "Shell".
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power\\bShell" }), []);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power\\BShell" }), ["PowerShell"]);
  });

  it("honors the (?i) inline case-insensitivity flag", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?i)powershell" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?i:power)Shell" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?i)[p]owershell" }), ["PowerShell"]);
    // The flag lapses at the end of the group that set it, so "SHELL" stays case-sensitive.
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?:(?i)power)SHELL" }), []);
  });

  it("uses ICU's character classes, not JavaScript's ASCII-only ones", () => {
    // Windows Terminal matches with ICU, where \w, \d, \b, and \s cover every script.
    const matches = (pattern: string, name: string) =>
      buildProfileMatcher({ type: "matchProfiles", name: pattern })!({ ...powershell, name });
    assert.equal(matches("\\w+", "Développement"), true);
    assert.equal(matches("\\bÉquipe\\b", "Équipe"), true);
    assert.equal(matches("\\d+", "١٢٣"), true);
    assert.equal(matches("\\D+", "١٢٣"), false);
    assert.equal(matches("\\W+", "Développement"), false);
    assert.equal(matches("a\\sb", "a b"), true);
    // \s is \p{White_Space}: vertical tab and next line count, the byte order mark doesn't.
    assert.equal(matches("a\\sb", "a" + String.fromCodePoint(0x0b) + "b"), true);
    assert.equal(matches("a\\sb", "a" + String.fromCodePoint(0x85) + "b"), true);
    assert.equal(matches("a\\sb", "a" + String.fromCodePoint(0xfeff) + "b"), false);
    assert.equal(matches("(?i)équipe", "ÉQUIPE"), true);
  });

  it("folds case like ICU under (?i), where a literal run can change length", () => {
    const matches = (pattern: string, name: string) =>
      buildProfileMatcher({ type: "matchProfiles", name: pattern })!({ ...powershell, name });
    // Two or more adjacent literals fold fully, so ß and SS are the same string.
    assert.equal(matches("(?i)straße", "STRASSE"), true);
    assert.equal(matches("(?i)straße", "Straße"), true);
    assert.equal(matches("(?i)strasse", "STRAẞE"), true);
    assert.equal(matches("(?i)ss", "ß"), true);
    assert.equal(matches("(?i)ssx", "ßx"), true);
    assert.equal(matches("(?i)sss", "ßs"), true);
    // A run can't end partway through a folded character: ß is two units, and "ss" against "sß"
    // would take only the first of them.
    assert.equal(matches("(?i)ss", "sß"), false);
    assert.equal(matches("(?i)ss", "ßs"), false);
    // A lone literal, or one under a quantifier, folds simply — one code point to one — so ß is ẞ
    // but never SS.
    assert.equal(matches("(?i)ß", "ẞ"), true);
    assert.equal(matches("(?i)ß", "SS"), false);
    assert.equal(matches("(?i)s", "ß"), false);
    assert.equal(matches("(?i)ß+", "ẞß"), true);
    assert.equal(matches("(?i)ß+", "ss"), false);
    // A class admits single-code-point case variants only; ß's uppercase "SS" doesn't put it in [A-Z].
    assert.equal(matches("(?i)[a-z]+", "STRASSE"), true);
    assert.equal(matches("(?i)[a-z]+", "straße"), false);
    // Case-sensitive matching is untouched.
    assert.equal(matches("straße", "STRASSE"), false);
    assert.equal(matches("ss", "ß"), false);
  });

  it("matches by code point, so one . consumes a whole emoji", () => {
    const matches = (pattern: string, name: string) =>
      buildProfileMatcher({ type: "matchProfiles", name: pattern })!({ ...powershell, name });
    assert.equal(matches(".", "🚀"), true);
    assert.equal(matches("..", "🚀"), false);
    assert.equal(matches("🚀+", "🚀🚀"), true);
    assert.equal(matches("[^a]", "🚀"), true);
    assert.equal(matches("[🚀-🚂]", "🚁"), true);
    // Ranges compare code points, not UTF-16 strings: [ｿ-🚀] (U+FF7F to U+1F680) is ascending,
    // and [a-￿] (up to U+FFFF) stops short of the astral 🚀.
    assert.equal(matches("[ｿ-🚀]+", "ｿ🚀"), true);
    assert.equal(matches("[a-￿]", "🚀"), false);
    assert.equal(matches("[a-￿]", "ｿ"), true);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[🚀-ｿ]" }), null);
  });

  it("doesn't let . match a line terminator, like ICU without its DOTALL flag", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "a.b" });
    assert.equal(matcher!({ ...powershell, name: "a b" }), true);
    assert.equal(matcher!({ ...powershell, name: "a\nb" }), false);
    assert.equal(matcher!({ ...powershell, name: "a b" }), false);
    // \s still covers it, so a pattern that means to cross a line can.
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "a\\sb" })!({ ...powershell, name: "a\nb" }), true);
  });

  it("reports a possessive quantifier as unsupported rather than malformed", () => {
    // a++ is valid ICU; treating the second "+" as a stray one would quietly match nothing.
    for (const pattern of ["a++", "a*+", "a?+", "a{2}+"]) {
      assert.throws(
        () => buildProfileMatcher({ type: "matchProfiles", name: pattern }),
        UnsupportedPatternError,
        pattern,
      );
    }
    // A lazy quantifier is still fine.
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "a+?" })!({ ...powershell, name: "aaa" }), true);
  });

  it("reports an escape it doesn't implement instead of matching it as a literal", () => {
    // These are valid for Windows Terminal, so unlike a malformed pattern (null: matches nothing
    // there either) they're surfaced to the caller — the message names the offending pattern.
    assert.throws(
      () => buildProfileMatcher({ type: "matchProfiles", name: "\\p{L}+" }),
      (error: unknown) => error instanceof UnsupportedPatternError && error.message.includes('"\\p{L}+"'),
    );
    assert.throws(
      () => buildProfileMatcher({ type: "matchProfiles", name: "(PowerShell)\\1" }),
      UnsupportedPatternError,
    );
    assert.throws(() => buildProfileMatcher({ type: "matchProfiles", name: "(?<=a)b" }), UnsupportedPatternError);
    // ICU set syntax that would otherwise parse as literals — [[:alpha:]] read as "[[:alph]" then
    // a literal "]" matched "a]" but not "a".
    assert.throws(() => buildProfileMatcher({ type: "matchProfiles", name: "[[:alpha:]]+" }), UnsupportedPatternError);
    assert.throws(() => buildProfileMatcher({ type: "matchProfiles", name: "[a-z&&[^m]]+" }), UnsupportedPatternError);
    assert.throws(() => buildProfileMatcher({ type: "matchProfiles", name: "[a-z&&b]+" }), UnsupportedPatternError);
  });

  it("reports a repeat whose counts can't merge when it exhausts the budget, rather than a non-match", () => {
    // Count ranges only merge when they're contiguous. (a|aaa) reaches counts two apart at the
    // same position, so below `min` every one is its own thread and a long value runs the budget
    // out. A known ceiling — but a visible one: the profile isn't silently dropped.
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "(a|aaa){1000,4000}" });
    assert.throws(() => matcher!({ ...powershell, name: "a".repeat(3000) }), UnsupportedPatternError);
    // The same body is fine once `.*` fills every count in between.
    const filled = buildProfileMatcher({ type: "matchProfiles", name: ".*(a|aaa){1000,4000}" });
    assert.equal(filled!({ ...powershell, name: "a".repeat(3000) }), true);
  });

  it("reports a match that exhausts the step budget instead of calling it a non-match", () => {
    // A large quantifier inside a large quantifier unrolls the inner one (see below), so the
    // compiled program is big and a long value keeps thousands of states live at every position.
    // That's a limit of this engine, not a fact about the profile — so it's an error, not `false`.
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: "(a{0,4000}){21}" });
    assert.throws(
      () => matcher!({ ...powershell, commandline: "a".repeat(3000) }),
      (error: unknown) => error instanceof UnsupportedPatternError && error.message.includes('"(a{0,4000}){21}"'),
    );
  });

  it("compiles and matches a large bounded quantifier on a simple atom, not just a small one", () => {
    // (a|b){0,4000} and a{0,12000} are the exact patterns raised in review: a large bound on a
    // simple atom is valid ICU syntax and must actually match, not be rejected outright.
    const wide = buildProfileMatcher({ type: "matchProfiles", name: "(a|b){0,4000}" });
    assert.notEqual(wide, null);
    assert.equal(wide!({ ...powershell, name: "a".repeat(4000) }), true);
    assert.equal(wide!({ ...powershell, name: "ab".repeat(2000) }), true);
    assert.equal(wide!({ ...powershell, name: "a".repeat(4001) }), false);
    assert.equal(wide!({ ...powershell, name: "c".repeat(4000) }), false);

    const literal = buildProfileMatcher({ type: "matchProfiles", commandline: "a{0,12000}" });
    assert.notEqual(literal, null);
    assert.equal(literal!({ ...powershell, commandline: "a".repeat(2000) }), true);
    assert.equal(literal!({ ...powershell, commandline: "a".repeat(12000) }), true);
    assert.equal(literal!({ ...powershell, commandline: "a".repeat(12001) }), false);
  });

  it("matches a large bounded quantifier quickly, since it no longer scales with the bound", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: "a{0,12000}" });
    const start = Date.now();
    matcher!({ ...powershell, commandline: "a".repeat(2000) });
    assert.ok(Date.now() - start < 200, "matching took too long");
  });

  it("unrolls the inner quantifier when a large quantifier wraps another large one", () => {
    // compileCountedRepeat's counter can't represent two independently-active repeats, so the
    // inner one is unrolled into plain instructions instead — (a{21}){21} is 441 a's exactly, and
    // matches with ICU, so it has to match here rather than being rejected.
    const nestedLarge = buildProfileMatcher({ type: "matchProfiles", name: "(a{21}){21}" });
    assert.equal(nestedLarge!({ ...powershell, name: "a".repeat(441) }), true);
    assert.equal(nestedLarge!({ ...powershell, name: "a".repeat(440) }), false);
    assert.equal(nestedLarge!({ ...powershell, name: "a".repeat(442) }), false);
    const start = Date.now();
    const wide = buildProfileMatcher({ type: "matchProfiles", name: "((a|b){200}){200}" });
    assert.ok(Date.now() - start < 1000, "compiling took too long");
    assert.equal(wide!({ ...powershell, name: "ab".repeat(20000) }), true);
    assert.equal(wide!({ ...powershell, name: "a".repeat(39999) }), false);
    // The unrolled body is still subject to the total program size cap.
    assert.throws(
      () => buildProfileMatcher({ type: "matchProfiles", name: "((a{1000}){1000}){1000}" }),
      UnsupportedPatternError,
    );
    // A large quantifier around plain (unquantified) content is unaffected.
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?:PowerShell){1,200}" }), ["PowerShell"]);
    // A *small* quantifier inside unrolls too, as it always did.
    const nested = buildProfileMatcher({ type: "matchProfiles", name: "(a?){2,4000}" });
    assert.equal(nested!({ ...powershell, name: "a" }), true);
    assert.equal(nested!({ ...powershell, name: "a".repeat(30) }), true);
    assert.equal(nested!({ ...powershell, name: "a".repeat(30) + "b" }), false);
    const fixed = buildProfileMatcher({ type: "matchProfiles", name: "(a{2}){2,4000}" });
    assert.equal(fixed!({ ...powershell, name: "a".repeat(4) }), true);
    assert.equal(fixed!({ ...powershell, name: "a".repeat(5) }), false);
  });

  it("still unrolls a small quantifier, so it can nest inside another quantifier", () => {
    // (a{2,5})* mixes two quantifiers, one nested in the other; both are small enough to unroll,
    // so no counted repeat is involved at all.
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "(a{2,5})*" });
    assert.equal(matcher!({ ...powershell, name: "aaa" }), true);
    assert.equal(matcher!({ ...powershell, name: "aaaaa" + "aaa" }), true);
    assert.equal(matcher!({ ...powershell, name: "a" }), false);
  });

  it("matches a large minimum reached from every position, without exhausting the budget", () => {
    // .* can enter a{1000,4000} at every position, so at position p the repeat is live with every
    // count from 0 to p — and below `min` none of those counts can stand in for another. Tracked
    // one by one that's O(n × min) work and the budget runs out on a 2,000-character value; kept
    // as one count range per thread it's linear.
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: ".*a{1000,4000}" });
    const start = Date.now();
    assert.equal(matcher!({ ...powershell, commandline: "a".repeat(2000) }), true);
    assert.equal(matcher!({ ...powershell, commandline: "b" + "a".repeat(4000) }), true);
    assert.equal(matcher!({ ...powershell, commandline: "a".repeat(999) }), false);
    assert.equal(matcher!({ ...powershell, commandline: "a".repeat(4000) + "b" }), false);
    assert.ok(Date.now() - start < 1000, "matching took too long");
    // The same with a minimum of 3000 out of a 3900-character value.
    const higher = buildProfileMatcher({ type: "matchProfiles", commandline: ".*a{3000,4000}" });
    assert.equal(higher!({ ...powershell, commandline: "a".repeat(3900) }), true);
  });

  it("matches a large counted repeat whose body doesn't consume a fixed number of characters", () => {
    // Different combinations of alternatives can reach the same string position after a different
    // number of reps. Threads inside a counted repeat are tracked by their exact counts, so both
    // trajectories survive and the one that still fits under `max` gets to match.
    // A nullable alternative: one empty rep plus one consuming rep satisfies the minimum of 2.
    const nullable = buildProfileMatcher({ type: "matchProfiles", name: "(|a){2,4000}" });
    assert.equal(nullable!({ ...powershell, name: "a" }), true);
    assert.equal(nullable!({ ...powershell, name: "b" }), false);
    // A large minimum on a nullable body is free to satisfy with empty reps, so it can't turn a
    // long value into budget-exhausting work either.
    const bigMin = buildProfileMatcher({ type: "matchProfiles", name: "(|a){3000,4000}" });
    assert.equal(bigMin!({ ...powershell, name: "a".repeat(2000) }), true);
    assert.equal(bigMin!({ ...powershell, name: "a".repeat(4001) }), false);
    // Two nonzero but differently-sized alternatives (1 vs 2 characters).
    const mixed = buildProfileMatcher({ type: "matchProfiles", name: "(a|aa){21,30}" });
    assert.equal(mixed!({ ...powershell, name: "a".repeat(21) }), true);
    assert.equal(mixed!({ ...powershell, name: "a".repeat(60) }), true);
    assert.equal(mixed!({ ...powershell, name: "a".repeat(20) }), false);
    assert.equal(mixed!({ ...powershell, name: "a".repeat(61) }), false);
  });

  it("keeps counts apart when the prefix can enter a large counted repeat at two positions", () => {
    // (?:x|xa) enters a{0,25} at position 1 or 2, so at every later position two threads share
    // the repeat's instructions with counts one apart. Only the position-2 entry has room for all
    // 26 trailing a's (25 of them under the quantifier); collapsing both threads onto one dedup
    // key kept whichever arrived first, and the wrong one hid the match.
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "(?:x|xa)a{0,25}" });
    assert.equal(matcher!({ ...powershell, name: "x" + "a".repeat(26) }), true);
    assert.equal(matcher!({ ...powershell, name: "x" + "a".repeat(25) }), true);
    assert.equal(matcher!({ ...powershell, name: "x" + "a".repeat(27) }), false);
  });

  it("matches correctly right up to the maximum of a large counted repeat, not just at the minimum", () => {
    // A prior fix reached `min` correctly but the dedup key still collapsed distinct in-progress
    // counts near `max`, dropping counts required to reach the top of the range.
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "a{2,25}" });
    assert.equal(matcher!({ ...powershell, name: "a".repeat(2) }), true);
    assert.equal(matcher!({ ...powershell, name: "a".repeat(24) }), true);
    assert.equal(matcher!({ ...powershell, name: "a".repeat(25) }), true);
    assert.equal(matcher!({ ...powershell, name: "a".repeat(26) }), false);
  });

  it("keeps two sequential large counted repeats independent within one match", () => {
    // Exiting the first repeat must not leave its count/countFor attached to the thread going
    // into the second — the second repeat's own instruction would then see a stale, unrelated
    // count, corrupting its own reps tracking and dedup key.
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "a{5,4000}a{5,4000}" });
    assert.equal(matcher!({ ...powershell, name: "a".repeat(10) }), true, "5+5 split");
    assert.equal(matcher!({ ...powershell, name: "a".repeat(8) }), false, "second field below its min");
  });

  it("keeps each field's counted repeat independent when an entry has more than one field", () => {
    // Each field compiles to its own program. A field's repeat metadata must stay tied to that
    // field's own program, not leak into whichever field happened to compile last.
    const matcher = buildProfileMatcher({
      type: "matchProfiles",
      name: "a{5,4000}",
      commandline: "b{50,4000}",
    });
    assert.notEqual(matcher, null);
    assert.equal(matcher!({ ...powershell, name: "a".repeat(5), commandline: "x" }), true);
    assert.equal(matcher!({ ...powershell, name: "x", commandline: "b".repeat(50) }), true);
    // Below commandline's own min (50), even though name's min (5) would already be satisfied.
    assert.equal(matcher!({ ...powershell, name: "x", commandline: "b".repeat(5) }), false);

    // The field with no counted repeat at all, compiled after the one that has one, previously
    // reset shared state the first field's program depended on and crashed matching entirely.
    const reordered = buildProfileMatcher({
      type: "matchProfiles",
      name: "a{0,4000}",
      commandline: "pwsh.exe",
    });
    assert.equal(reordered!({ ...powershell, name: "aaa", commandline: "nope.exe" }), true);
  });
});

describe("resolveNewTabMenuOrder", () => {
  it("places an explicit profile after remainingProfiles", () => {
    const order = resolveNewTabMenuOrder(profiles, [
      { type: "remainingProfiles" },
      { type: "profile", profile: "PowerShell" },
    ]);
    assert.deepEqual(order, ["{p2}", "{p3}", "{p4}", "{p1}"]);
  });

  it("counts references inside folders when expanding the remainder", () => {
    const order = resolveNewTabMenuOrder(profiles, [
      { type: "remainingProfiles" },
      { type: "folder", entries: [{ type: "matchProfiles", source: ".*" }] },
    ]);
    assert.deepEqual(order, ["{p1}", "{p2}", "{p3}", "{p4}"]);
  });

  it("surfaces a pattern it can't evaluate instead of returning an order with profiles missing", () => {
    // A malformed pattern matches nothing, as in Windows Terminal, and the order still resolves.
    const order = resolveNewTabMenuOrder(profiles, [
      { type: "matchProfiles", name: "[" },
      { type: "remainingProfiles" },
    ]);
    assert.deepEqual(order, ["{p1}", "{p2}", "{p3}", "{p4}"]);
    // A pattern valid in Windows Terminal but unsupported here would silently move PowerShell into
    // the remainder — so it throws for the caller to report instead.
    assert.throws(
      () =>
        resolveNewTabMenuOrder(profiles, [
          { type: "folder", entries: [{ type: "matchProfiles", name: "\\p{L}+" }] },
          { type: "remainingProfiles" },
        ]),
      UnsupportedPatternError,
    );
  });
});
