import assert from "node:assert/strict";
import { test } from "node:test";
import { hasMatch, highlight, marksFor } from "../src/lib/highlight";

/** The treatment, spelled once, so a change of markers moves one line. */
function hi(text: string) {
  return `<ins>**${text}**</ins>`;
}

test("a matched word is marked where it appears", () => {
  assert.equal(
    highlight("the ripgrep sweep", ["ripgrep"]),
    `the ${hi("ripgrep")} sweep`,
  );
});

test("matching is case-insensitive and keeps the text's own case", () => {
  // ripgrep runs -i, so a lowercase query matched this line; the mark has to
  // land on it as written rather than on a lowercased copy.
  assert.equal(
    highlight("The RipGrep sweep", ["ripgrep"]),
    `The ${hi("RipGrep")} sweep`,
  );
});

test("a match inside a word is marked", () => {
  // Search is a substring sweep, so this is what "matched" means; `**` is used
  // rather than `_` because only it takes effect mid-word.
  assert.equal(highlight("linkifying", ["link"]), `${hi("link")}ifying`);
});

test("every occurrence is marked, and every word", () => {
  assert.equal(
    highlight("a hit then another hit", ["hit"]),
    `a ${hi("hit")} then another ${hi("hit")}`,
  );
  assert.equal(
    highlight("corpus and manifest", ["corpus", "manifest"]),
    `${hi("corpus")} and ${hi("manifest")}`,
  );
});

test("overlapping and adjacent matches become one mark", () => {
  // Nested markers render as neither, and `</ins><ins>` between two halves of
  // one word puts a seam through it.
  assert.equal(highlight("links", ["links", "link"]), hi("links"));
  assert.equal(highlight("highlight", ["high", "light"]), hi("highlight"));
  assert.equal(
    highlight("searchable", ["search", "arch"]),
    `${hi("search")}able`,
  );
});

test("no words, or no match, leaves the text alone", () => {
  assert.equal(highlight("the ripgrep sweep", []), "the ripgrep sweep");
  assert.equal(highlight("the ripgrep sweep", ["corpus"]), "the ripgrep sweep");
});

test("a pane holding the whole query marks the phrase, not its words", () => {
  // The reason marksFor exists: with `what the` on screen whole, a word mark
  // on the `the` inside `then` says only that the query's words are common.
  const text = "what the sweep saw, and then some";
  assert.equal(
    highlight(text, marksFor([text], ["what", "the"])),
    `${hi("what the")} sweep saw, and then some`,
  );
});

test("without the phrase anywhere, marking stays word by word", () => {
  const text = "what happened then";
  assert.equal(
    highlight(text, marksFor([text], ["what", "the"])),
    `${hi("what")} happened ${hi("the")}n`,
  );
});

test("the phrase decision is pane-wide, not per message", () => {
  // One message shows the phrase, so its neighbour keeps its stray `the`
  // unmarked instead of drawing noise about the same hit.
  const marks = marksFor(["what the sweep saw", "and then some"], [
    "what",
    "the",
  ]);
  assert.equal(highlight("and then some", marks), "and then some");
});

test("a phrase is matched across any whitespace, case-insensitively", () => {
  // The indexer collapses whitespace runs before the sweep matches, so the
  // pane counts the same occurrences the search did.
  const text = "What \t THE sweep saw";
  assert.equal(
    highlight(text, marksFor([text], ["what", "the"])),
    `${hi("What \t THE")} sweep saw`,
  );
});

test("a phrase broken across a line counts, and draws no mark", () => {
  // Marks are spliced one line at a time, so the occurrence cannot be marked;
  // suppressing the word noise around it is the point, so it still decides.
  const text = "what\nthe sweep saw then";
  assert.equal(highlight(text, marksFor([text], ["what", "the"])), text);
});

test("a phrase does not span a blank line", () => {
  // Two words either side of a paragraph break are not a phrase anyone sees,
  // and heading demotion manufactures such breaks; counting them silenced
  // every real mark on the pane.
  // The blank line has to be the only candidate: `what then` would hold the
  // phrase outright, the `the` of `then` following `what` on the same line.
  const text = "what\n\nthe redesign, and what happened then";
  assert.equal(
    highlight(text, marksFor([text], ["what", "the"])),
    `${hi("what")}\n\n${hi("the")} redesign, and ${hi("what")} happened ${hi("the")}n`,
  );
});

test("a phrase in text the pane never renders does not count", () => {
  // The suppression is only honest where the reader can see the phrase. Found
  // in a link target, a reference definition or a tag-shaped span, it hid
  // every mark on a pane that showed no phrase either — strictly worse than
  // the word noise the phrase rule exists to avoid.
  const words = ["search", "agent"];
  for (const text of [
    "see [notes](./search agent notes.md) and the agent search log",
    "[ref]: ./search agent notes.md\n\nthe agent search log",
    "if a < b before search agent runs > done; the agent search log",
  ])
    assert.match(highlight(text, marksFor([text], words)), /<ins>/);
});

test("a phrase inside code counts even where it is tag- or link-shaped", () => {
  // Code is exempt from the visibility strip, which is why it runs through
  // mapProse: the renderer prints `<search agent>` inside a fence as itself,
  // so the reader sees the phrase and the word marks stay off.
  const words = ["search", "agent"];
  for (const text of [
    "```\nfoo <search agent> bar\n```\nthe agent search log",
    "```\n[search agent](./x.md)\n```\nthe agent search log",
    "run `search agent` first, then the agent search log",
  ])
    assert.doesNotMatch(highlight(text, marksFor([text], words)), /<ins>/);
});

test("a link's own text is visible, so a phrase in it counts", () => {
  // The half of a link that renders, and the mark lands on it.
  const text = "see [the search agent docs](./x.md) and the agent search log";
  assert.equal(
    highlight(text, marksFor([text], ["search", "agent"])),
    `see [the ${hi("search agent")} docs](./x.md) and the agent search log`,
  );
});

test("cutting an invisible region out cannot forge a phrase", () => {
  // The fixtures have to be regions that actually collapse — an image, a bare
  // URL, a tag — since a labelled link leaves its label behind and never
  // reaches the substitution at all. A space here would let the phrase close
  // over the gap, and since the marker still protects the region, the pane
  // went silent with both words plainly on screen.
  for (const [region, text] of [
    ["an image", "a search ![](file:///tmp/x.png) agent b"],
    ["a bare URL", "a search https://example.com/z agent b"],
    ["a tag", "a search <br> agent b"],
  ])
    assert.equal(
      highlight(text, marksFor([text], ["search", "agent"])),
      text.replace("search", hi("search")).replace(" agent", ` ${hi("agent")}`),
      region,
    );
});

test("an empty query word never becomes a phrase", () => {
  // Joined into the pattern it is a bare `\s+`, which underlines every space
  // on screen inside markers that whitespace stops from rendering.
  assert.deepEqual(marksFor(["a b"], ["", ""]), ["", ""]);
  assert.equal(highlight("a b", marksFor(["a b"], ["", "b"])), `a ${hi("b")}`);
});

test("a phrase only a code block holds still suppresses word marks", () => {
  // The user can plainly see their query in the fence; underlining every
  // `what` and `the` in the prose around it would not help them find it.
  const text = "```\nwhat the\n```\nwhat happened then";
  assert.equal(highlight(text, marksFor([text], ["what", "the"])), text);
});

test("phrase words match literally, not as regex", () => {
  assert.equal(
    highlight("a.b c here", marksFor(["a.b c here"], ["a.b", "c"])),
    `${hi("a.b c")} here`,
  );
  // `.` must not wildcard: no phrase in this pane, so words mark instead.
  assert.equal(
    highlight("axb c", marksFor(["axb c"], ["a.b", "c"])),
    `axb ${hi("c")}`,
  );
});

test("adjacent phrase matches become one mark", () => {
  // The same seam rule the words follow: `</ins><ins>` mid-run draws a break.
  assert.equal(highlight("a ba b", marksFor(["a ba b"], ["a", "b"])), hi("a ba b"));
});

test("a single word never becomes a phrase", () => {
  // Nothing to join, and the indexOf path is the one whose offsets guard
  // against lowercasing hazards.
  assert.deepEqual(marksFor(["a hit here"], ["hit"]), ["hit"]);
});

test("fenced code is left as written", () => {
  // The renderer prints the tags literally inside a fence, so marking there
  // corrupts the code it is meant to show.
  const text = "```ts\nconst hit = 1;\n```";
  assert.equal(highlight(text, ["hit"]), text);
});

test("a fence is only closed by its own character and length", () => {
  // The same rule `links.ts` and `detail.ts` walk by; a `~~~` line inside a
  // ``` block closes nothing, and a toggle blind to that starts marking code.
  const text = "```\n~~~\nconst hit = 1;\n~~~\n```\nthen hit";
  assert.equal(
    highlight(text, ["hit"]),
    `\`\`\`\n~~~\nconst hit = 1;\n~~~\n\`\`\`\nthen ${hi("hit")}`,
  );
});

test("indented code is left as written", () => {
  const text = "paragraph\n\n    const hit = 1;\n";
  assert.equal(highlight(text, ["hit"]), text);
});

test("an inline code span is left as written", () => {
  assert.equal(
    highlight("run `npm hit` then hit", ["hit"]),
    `run \`npm hit\` then ${hi("hit")}`,
  );
});

test("a link's text is marked and its target is not", () => {
  // A tag spliced into a URL breaks the link outright; the text renders the
  // mark over the link colour, which the pane probe confirmed.
  assert.equal(
    highlight("[the hit docs](https://example.com/hit)", ["hit"]),
    `[the ${hi("hit")} docs](https://example.com/hit)`,
  );
});

test("a target orphaned by a code span in the link text is still left alone", () => {
  // The span cuts the line, so the link never reaches the marker whole; a
  // relative target has no scheme to be recognised by either, and a mark
  // spliced into it kills the link.
  const text = "see [`src/hit/x.ts`](./hit/notes.md) now";
  assert.equal(highlight(text, ["hit"]), text);
});

test("an image embed is left alone entirely", () => {
  // Its alt text is never drawn, and its URL is a path this pane just resolved.
  const text = "![](file:///tmp/hit-1.png)";
  assert.equal(highlight(text, ["hit"]), text);
  // Including the size the embed pass writes onto it: a query about this
  // extension matches its own words.
  const sized = "![](file:///tmp/hit-1.png?raycast-width=350)";
  assert.equal(highlight(sized, ["raycast", "width"]), sized);
});

test("a bare URL is left alone", () => {
  const text = "see https://example.com/hit/page for it";
  assert.equal(highlight(text, ["hit"]), text);
});

test("prose in a blockquote is still marked", () => {
  assert.equal(
    highlight("> the hit sweep", ["hit"]),
    `> the ${hi("hit")} sweep`,
  );
});

test("marks do not leak across lines", () => {
  assert.equal(
    highlight("first hit\nsecond hit", ["hit"]),
    `first ${hi("hit")}\nsecond ${hi("hit")}`,
  );
});

test("hasMatch answers for any one word, anywhere in the text", () => {
  // Any word, not every word: a mark appears wherever one of them lands, and
  // this exists to say whether the pane would draw one.
  assert.equal(hasMatch("the ripgrep sweep", ["corpus", "sweep"]), true);
  assert.equal(hasMatch("linkifying", ["link"]), true);
  assert.equal(hasMatch("the ripgrep sweep", ["corpus"]), false);
});

test("hasMatch is case-insensitive, like the marks", () => {
  assert.equal(hasMatch("The RipGrep sweep", ["ripgrep"]), true);
});

test("hasMatch stays looser than the marks, never stricter", () => {
  // U+0130 lowercases to two code units, so `ranges` gives up on case folding
  // for that line rather than mark the wrong offsets. `hasMatch` has no offsets
  // to get wrong, so it keeps folding — and it must, because `ranges` works a
  // line at a time while this reads a whole message: matching the guard here
  // would let one such character release a window whose next line the pane
  // visibly marks.
  assert.equal(hasMatch("İstanbul\nDEPLOY here", ["deploy"]), true);
  assert.equal(
    highlight("İstanbul\nDEPLOY here", ["deploy"]),
    `İstanbul\n${hi("DEPLOY")} here`,
  );
  // Same line: the pane holds the window and draws no mark on it. That way
  // round is the harmless one.
  assert.equal(hasMatch("İstanbul DEPLOY", ["deploy"]), true);
  assert.equal(highlight("İstanbul DEPLOY", ["deploy"]), "İstanbul DEPLOY");
});

test("hasMatch says yes to a word only a code block holds", () => {
  // `highlight` cannot mark inside a fence, but the text the user typed is on
  // screen, so the pane has no reason to move off it.
  assert.equal(hasMatch("```ts\nconst hit = 1;\n```", ["hit"]), true);
});

test("hasMatch with no words is no match", () => {
  // The caller asks a different question when there is nothing to search for.
  assert.equal(hasMatch("the ripgrep sweep", []), false);
});
