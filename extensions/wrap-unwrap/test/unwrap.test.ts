import { test } from "node:test";
import assert from "node:assert/strict";
import { unwrap } from "../src/lib/unwrap.js";

const dflt = {
  hyphenation: true,
  keepBlankLines: false,
  flattenBullets: false,
};

test("unwrap joins consecutive prose lines with a single space", () => {
  const input = "alpha\nbeta\ngamma";
  assert.equal(unwrap(input, dflt), "alpha beta gamma");
});

test("unwrap preserves paragraph breaks via blank lines", () => {
  const input = "alpha\nbeta\n\ngamma\ndelta";
  assert.equal(unwrap(input, dflt), "alpha beta\n\ngamma delta");
});

test("unwrap collapses multiple blank lines by default", () => {
  const input = "alpha\n\n\n\nbeta";
  assert.equal(unwrap(input, dflt), "alpha\n\nbeta");
});

test("unwrap preserves blank-line runs when keepBlankLines is on", () => {
  const input = "alpha\n\n\nbeta";
  assert.equal(unwrap(input, { ...dflt, keepBlankLines: true }), "alpha\n\n\nbeta");
});

test("unwrap leaves fenced code untouched", () => {
  const input = "intro\n```\nline 1\nline 2\n```\nafter";
  assert.equal(unwrap(input, dflt), "intro\n```\nline 1\nline 2\n```\nafter");
});

test("unwrap leaves headings on their own line", () => {
  const input = "# Title\nbody one\nbody two";
  assert.equal(unwrap(input, dflt), "# Title\nbody one body two");
});

test("unwrap reflows blockquote content within depth", () => {
  const input = "> quote\n> continues here";
  assert.equal(unwrap(input, dflt), "> quote continues here");
});

test("unwrap respects nested blockquote depth", () => {
  const input = "> outer\n> > inner\n> > more inner";
  assert.equal(unwrap(input, dflt), "> outer\n> > inner more inner");
});

test("unwrap merges list-item continuation lines", () => {
  const input = "- item one\n  continues\n- item two";
  assert.equal(unwrap(input, dflt), "- item one continues\n- item two");
});

test("unwrap keeps an ASCII hyphen at a break, joining tight (strip ON)", () => {
  // ON strips only a true U+00AD soft hyphen. An ASCII "-" is indistinguishable
  // from a real compound ("well-/known"), so it is preserved and the halves are
  // joined with no space. See the R3 tests for the U+00AD behavior.
  const input = "an inter-\nesting word";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "an inter-esting word");
});

test("unwrap leaves single-line compounds alone (not split, no hyphenation runs)", () => {
  const input = "state-of-the-art";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "state-of-the-art");
});

test("unwrap rejoins a hyphen-then-letter break with NO space (capital-led, not stripped)", () => {
  // A hyphen at the break followed by a letter is a word-internal break: rejoin
  // with no space. Capital-led runs aren't treated as soft, so the hyphen stays —
  // but the dangling "State- wide" space was a bug. Correct: "State-wide".
  const input = "A State-\nwide policy";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "A State-wide policy");
});

test("unwrap rejoins a mid-compound break with NO space and no strip", () => {
  // state-of-the- + art is a hyphen chain; stripping the trailing hyphen would
  // mash "the"+"art". So keep the hyphen, but rejoin with no space.
  const input = "the state-of-the-\nart";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "the state-of-the-art");
});

test("unwrap real compound rejoins with no space, hyphen kept (strip ON)", () => {
  // "well-known" split at the break: the hyphen is KEPT even with strip ON, because
  // an ASCII hyphen can't be told from a real compound — destroying "well-known"
  // into "wellknown" is the worse failure. Only U+00AD is ever stripped.
  const input = "a well-\nknown fact";
  assert.equal(unwrap(input, { ...dflt, hyphenation: true }), "a well-known fact");
});

test("unwrap with hyphenation off keeps the hyphen and rejoins with NO space", () => {
  // OFF = don't strip. A hyphen-then-letter break still rejoins with no space:
  // "inter-esting", not "inter- esting".
  const input = "an inter-\nesting word";
  assert.equal(unwrap(input, { ...dflt, hyphenation: false }), "an inter-esting word");
});

test("unwrap with hyphenation off preserves a real compound across the break", () => {
  const input = "a well-\nknown fact";
  assert.equal(unwrap(input, { ...dflt, hyphenation: false }), "a well-known fact");
});

test("unwrap word-joins a hyphen followed by a digit (number range)", () => {
  // A hyphen-broken numeric range is one token: "5-\n10" is "5-10", never "5- 10".
  // The hyphen is kept (never stripped), so no range is mashed into "510".
  const input = "range 5-\n10 items";
  assert.equal(unwrap(input, dflt), "range 5-10 items");
  assert.equal(unwrap("call 555-\n1234 now", dflt), "call 555-1234 now");
});

test("unwrap protects inline code from joins", () => {
  const input = "see `foo bar`\ndocs";
  assert.equal(unwrap(input, dflt), "see `foo bar` docs");
});

test("unwrap protects inline links", () => {
  const input = "go to [the docs](https://x.test/a b)\nplease";
  assert.equal(unwrap(input, dflt), "go to [the docs](https://x.test/a b) please");
});

test("unwrap preserves hard-break-terminated lines", () => {
  const input = "line one  \nline two";
  // The hard-break terminates the reflow group.
  assert.equal(unwrap(input, dflt), "line one  \nline two");
});

test("unwrap handles empty input", () => {
  assert.equal(unwrap("", dflt), "");
});

test("unwrap normalizes CRLF line endings", () => {
  assert.equal(unwrap("a\r\nb\r\nc", dflt), "a b c");
});

test("unwrap preserves nested list indentation", () => {
  // Round-trip preserves the 2-space indent on the nested item.
  const input = "- outer\n  * nested";
  assert.equal(unwrap(input, dflt), "- outer\n  * nested");
});

test("unwrap preserves multi-space gap after list marker", () => {
  // A 3-space gap between marker and content is intentional alignment.
  const input = "-   item one\n-   item two";
  assert.equal(unwrap(input, dflt), "-   item one\n-   item two");
});

test("flattenBullets normalizes leading-space bullets to a 2-space step", () => {
  // The Harvest-email case: top-level ordered items at col 0, sub-bullets
  // pasted with 3 leading spaces. Without the option they round-trip
  // verbatim; with it the sub-bullets normalize to depth 1 (2 spaces).
  const input = "1. ITC details\n   - cost basis?\n   - pass-through?";
  assert.equal(unwrap(input, { ...dflt, flattenBullets: true }), "1. ITC details\n  - cost basis?\n  - pass-through?");
});

test("flattenBullets is off by default (indentation preserved)", () => {
  const input = "1. ITC details\n   - cost basis?";
  assert.equal(unwrap(input, dflt), "1. ITC details\n   - cost basis?");
});

test("flattenBullets maps three indent levels to 0/2/4 spaces", () => {
  const input = "- a\n   - b\n      - c";
  assert.equal(unwrap(input, { ...dflt, flattenBullets: true }), "- a\n  - b\n    - c");
});

test("flattenBullets recomputes depth per contiguous list block", () => {
  // Two blocks separated by a blank line; the second uses different raw
  // indentation but its shallowest item must still land at column 0.
  const input = "- a\n   - b\n\n     - c\n        - d";
  assert.equal(unwrap(input, { ...dflt, flattenBullets: true }), "- a\n  - b\n\n- c\n  - d");
});

test("flattenBullets handles Unicode bullet markers", () => {
  const input = "  • alpha\n  • beta";
  assert.equal(unwrap(input, { ...dflt, flattenBullets: true }), "• alpha\n• beta");
});

test("flattenBullets flattens an over-indented single-level list to col 0", () => {
  const input = "     - only\n     - level";
  assert.equal(unwrap(input, { ...dflt, flattenBullets: true }), "- only\n- level");
});

test("em-dash lines stay prose unless flattenBullets is enabled", () => {
  const input = "— first\n— second";
  assert.equal(unwrap(input, dflt), "— first — second");
  assert.equal(unwrap(input, { ...dflt, flattenBullets: true }), "— first\n— second");
});

// ─── Review findings (2026-07-25 adversarial review) ────────────────────────

test("R1 unwrap does not corrupt a literal hyphen inside a code span", () => {
  assert.equal(unwrap("`foo-\nbar`", dflt), "`foo- bar`");
});

test("R1 unwrap does not corrupt a literal hyphen inside a link URL", () => {
  assert.equal(
    unwrap("[docs](https://example.test/foo-\nbar)", dflt),
    "[docs](https://example.test/foo- bar)",
  );
});

test("R2 unwrap rejoins a hyphen break before a non-ASCII letter", () => {
  assert.equal(unwrap("co-\növerse", { ...dflt, hyphenation: false }), "co-överse");
  assert.equal(unwrap("Bindestrich-\nWörter", { ...dflt, hyphenation: false }), "Bindestrich-Wörter");
});

test("R3 unwrap strips a true Unicode soft hyphen (U+00AD) when ON", () => {
  assert.equal(unwrap("hy­\nphen", { ...dflt, hyphenation: true }), "hyphen");
});

test("R3 unwrap keeps a Unicode soft hyphen when OFF", () => {
  assert.equal(unwrap("hy­\nphen", { ...dflt, hyphenation: false }), "hy­phen");
});

test("R4 unwrap joins a hyphenated numeric range with no space", () => {
  assert.equal(unwrap("range 5-\n10 items", dflt), "range 5-10 items");
  assert.equal(unwrap("call 555-\n1234 now", dflt), "call 555-1234 now");
});

test("R-policy: ASCII hyphen at a break is never stripped, always joined tight", () => {
  assert.equal(unwrap("a well-\nknown fact", { ...dflt, hyphenation: true }), "a well-known fact");
  assert.equal(unwrap("an inter-\nesting word", { ...dflt, hyphenation: true }), "an inter-esting word");
  assert.equal(unwrap("the state-of-the-\nart", { ...dflt, hyphenation: true }), "the state-of-the-art");
});

test("H1 unwrap preserves indentation before a blockquote inside a list item", () => {
  const input = "1. list item\n   > alpha beta";
  assert.equal(unwrap(input, dflt), "1. list item\n   > alpha beta");
});

test("H3 unwrap treats a tab-indented line as code, not prose", () => {
  assert.equal(unwrap("\tcode line\nnext line", dflt), "\tcode line\nnext line");
});

test("L1 unwrap does not treat an even run of trailing backslashes as a hard break", () => {
  assert.equal(unwrap("literal\\\\\nnext", dflt), "literal\\\\ next");
});

test("inline-token guard uses span structure, not backtick parity", () => {
  // A closed ``a`b`` span must not read as open (its inner tick is content), so the
  // following prose hyphen still joins tight.
  assert.equal(unwrap("``a`b`` word-\nnext", dflt), "``a`b`` word-next");
  // An open span after any number of closed ones must still be detected.
  assert.equal(unwrap("`a` `b` `foo-\nbar`", dflt), "`a` `b` `foo- bar`");
  assert.equal(unwrap("``x`` `foo-\nbar`", dflt), "``x`` `foo- bar`");
});

test("unwrap stays linear on a long single-paragraph paste", () => {
  // Regression guard for two O(n²) traps, both of which made a legal <=1MB paste
  // hang Raycast for seconds: rescanning the accumulated paragraph with an anchored
  // regex, and slicing it per join (which forces V8 to flatten the rope).
  const lines = 20_000;
  const input = Array.from({ length: lines }, (_, i) => `word${i} filler text here`).join("\n");
  const started = process.hrtime.bigint();
  const out = unwrap(input, dflt);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(out.split("\n").length, 1, "should collapse to a single paragraph");
  // Generous bound: the linear implementation runs in ~15ms, the quadratic one took
  // >1000ms at this size. Anything near the ceiling means a rope-flattening slice or
  // full-accumulator regex came back.
  assert.ok(elapsedMs < 400, `unwrap took ${elapsedMs.toFixed(0)}ms — quadratic path likely reintroduced`);
});

test("unwrap rejoins across an astral (surrogate-pair) letter", () => {
  // The tail tracked for the hyphen test must not split a surrogate pair, or
  // \p{L} stops matching and the tight join is lost.
  assert.equal(unwrap("𐐀-\nword", { ...dflt, hyphenation: false }), "𐐀-word");
  assert.equal(unwrap("𐐀-\n𐐀", { ...dflt, hyphenation: false }), "𐐀-𐐀");
});

test("unwrap keeps a hyphen literal inside a URL with balanced parens", () => {
  // CommonMark allows balanced parens in a destination, so the first ")" is not
  // the closer — treating it as one tight-joined real URL data.
  assert.equal(
    unwrap("[a](https://x.test/(foo)bar-\nword)", dflt),
    "[a](https://x.test/(foo)bar- word)",
  );
});

test("unwrap rejoins continuations under a no-space blockquote marker", () => {
  // wrap() emits a ">"-quoted list item's continuation as ">  text" (marker + hang
  // indent). Re-reading that, BLOCKQUOTE_PEEL greedily eats one space, so the
  // continuation looked like ">"+space while the header was bare ">" — different
  // prefix stacks, so the lines were never rejoined.
  assert.equal(
    unwrap(">- alpha beta\n>  gamma delta", dflt),
    ">- alpha beta gamma delta",
  );
  // Plain prose under a bare ">" must still rejoin.
  assert.equal(unwrap(">alpha\n>beta", dflt), ">alpha beta");
});

test("unwrap keeps genuinely different blockquote depths apart", () => {
  // The relaxation above must not merge across a real depth change.
  assert.equal(unwrap(">outer\n>> inner", dflt), ">outer\n>> inner");
});

test("unwrap keeps a list-nested blockquote separate from a root-level one", () => {
  // Indentation before the marker is structural: "   > x" is inside the list item,
  // "> x" is a root-level quote. Same frame depth, different blocks.
  assert.equal(unwrap("1. outer\n   > alpha\n> beta", dflt), "1. outer\n   > alpha\n> beta");
  // Same indent still merges.
  assert.equal(unwrap("1. outer\n   > alpha\n   > beta", dflt), "1. outer\n   > alpha beta");
});

test("unwrap ignores escaped inline delimiters when deciding a join", () => {
  // A backslash-escaped backtick or "](" is literal text and must not leave the
  // inline state open, which would suppress the tight hyphen join.
  assert.equal(unwrap("literal \\`tick word-\nnext", dflt), "literal \\`tick word-next");
  assert.equal(unwrap("literal \\](x word-\nnext", dflt), "literal \\](x word-next");
});

test("unwrap merges a blockquote whose marker indent varies within 0-3 spaces", () => {
  // CommonMark allows 0-3 spaces before a quote marker, so these are one quote.
  assert.equal(unwrap(" > alpha beta\n  > gamma delta", dflt), " > alpha beta gamma delta");
  assert.equal(unwrap("> alpha\n   > beta", dflt), "> alpha beta");
});

test("a quote is only list-nested if it reaches the item's content column", () => {
  // "123456789. " puts content at column 11, so a one-space "> alpha" is a legal
  // ROOT blockquote and must merge with the "> gamma" that follows.
  assert.equal(
    unwrap("123456789. item\n > alpha beta\n> gamma delta", dflt),
    "123456789. item\n > alpha beta gamma delta",
  );
  // A 3-space quote under "1. " (content column 3) IS inside the item.
  assert.equal(unwrap("1. outer\n   > alpha\n> beta", dflt), "1. outer\n   > alpha\n> beta");
});

test("a quote nested in a list inside a quote stays distinct from the outer root", () => {
  // Prefix ">   > " is indented under the list item within the outer quote; looking
  // only at the first character of the prefix never saw that.
  assert.equal(
    unwrap("> - item\n>   > alpha beta\n> > gamma delta", dflt),
    "> - item\n>   > alpha beta\n> > gamma delta",
  );
});

test("the governing list item is the most recent one, not the narrowest sibling", () => {
  // A narrow earlier marker ("1. ", column 3) must not lower the bar for a later
  // wide one ("123456789. ", column 11): the 3-space quote is root-level there.
  assert.equal(
    unwrap("1. short\n123456789. wide\n   > alpha beta\n> gamma delta", dflt),
    "1. short\n123456789. wide\n   > alpha beta gamma delta",
  );
});

test("root prose closes an open list for blockquote grouping", () => {
  // A line back at the margin ends a list just as a blank line does. Clearing the
  // list-context state only on blank left the prior item's content column live, so a
  // 3-space root quote was marked list-nested while the unindented quote after it was
  // not — splitting one root blockquote paragraph into two groups.
  assert.equal(
    unwrap("1. item\nroot prose closes the list\n   > alpha beta\n> gamma delta", dflt),
    "1. item root prose closes the list\n   > alpha beta gamma delta",
  );
  // A heading closes it too.
  assert.equal(unwrap("1. item\n# H\n   > alpha\n> beta", dflt), "1. item\n# H\n   > alpha beta");
});

test("an indented continuation does NOT close the list", () => {
  // Lazy continuations belong to the open item and must keep it open, or the quote
  // that follows would wrongly merge with a root-level one.
  assert.equal(
    unwrap("1. item\n   continues here\n   > alpha\n> beta", dflt),
    "1. item continues here\n   > alpha\n> beta",
  );
});
