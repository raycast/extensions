import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { TranscriptMessage } from "../src/lib/corpus";
import type { LinkOptions } from "../src/lib/links";
import {
  escapeMarkdown,
  fallbackText,
  paneMarkdown,
  renderPane,
  sessionHeader,
} from "../src/lib/detail";
import { headerPathChars } from "../src/lib/format";
import { hit, session } from "./fixtures";

const DIR = mkdtempSync(join(tmpdir(), "detail-"));
process.on("exit", () => rmSync(DIR, { recursive: true, force: true }));

/**
 * The pane's two steps run back to back, which is how the command runs them —
 * split only so that typing re-marks without re-rendering. Tests about what
 * the pane says are about the pair.
 */
function contextMarkdown(
  messages: TranscriptMessage[],
  fallback?: string,
  { links, words }: { links?: LinkOptions; words?: string[] } = {},
) {
  return paneMarkdown(renderPane(messages, links), fallback, words);
}

/**
 * An assistant message by default, the one the pane renders verbatim. Tests
 * about markdown rendering are speaker-agnostic and read better without a quote
 * marker on every expected line; the ones about speakers set the flag.
 */
function message(text: string, over: Partial<TranscriptMessage> = {}) {
  return { seq: 0, fromUser: false, text, ...over };
}

test("inline markup in flattened text renders as itself", () => {
  assert.equal(
    escapeMarkdown("use **bold** and _under_"),
    String.raw`use \*\*bold\*\* and \_under\_`,
  );
  assert.equal(escapeMarkdown("run `npm test`"), String.raw`run \`npm test\``);
  // The brackets alone kill the link, so the parens are left as themselves.
  assert.equal(
    escapeMarkdown("see [docs](url)"),
    String.raw`see \[docs\](url)`,
  );
  assert.equal(escapeMarkdown("a < b"), String.raw`a \< b`);
  // Without this an entity written in a transcript resolves, so `&lt;div&gt;`
  // came out as a tag.
  assert.equal(escapeMarkdown("a &amp; b"), String.raw`a \&amp; b`);
  assert.equal(escapeMarkdown("path\\to\\file"), String.raw`path\\to\\file`);
  // Strikethrough takes a doubled tilde, and escaping the single one put a
  // backslash in front of every home-relative path.
  assert.equal(escapeMarkdown("~~struck~~"), String.raw`\~\~struck\~\~`);
  assert.equal(escapeMarkdown("~/code/pixie"), "~/code/pixie");
});

test("ordinary prose is left untouched", () => {
  const text = "The indexer folds each transcript into corpus.txt, then stops.";
  assert.equal(escapeMarkdown(text), text);
});

test("block constructs are defused only where they would bite", () => {
  // A flattened chunk is one line, so only its first character starts a block.
  assert.equal(escapeMarkdown("- a list item"), String.raw`\- a list item`);
  assert.equal(escapeMarkdown("1. first step"), String.raw`1\. first step`);
  assert.equal(escapeMarkdown("+ added"), String.raw`\+ added`);
  // `1)` numbers a list exactly as `1.` does.
  assert.equal(escapeMarkdown("1) first step"), String.raw`1\) first step`);
  assert.equal(escapeMarkdown("cost - benefit"), "cost - benefit");
  assert.equal(escapeMarkdown("step 1. of many"), "step 1. of many");
});

test("headings and quotes are defused at the start of the line", () => {
  assert.equal(escapeMarkdown("# heading"), String.raw`\# heading`);
  assert.equal(escapeMarkdown("> quoted"), String.raw`\> quoted`);
  assert.equal(escapeMarkdown("issue #12 is a > b"), "issue #12 is a > b");
});

test("transcript messages keep their markdown", () => {
  // Reading the transcript rather than the corpus exists for this: fenced code
  // has to survive to be highlighted.
  const code = "Try this:\n\n```ts\nconst a = 1;\n```";
  assert.equal(contextMarkdown([message(code)]), code);
});

test("the user's turns are quoted and the agent's are not", () => {
  // A rule between speakers said only that the speaker had changed, never
  // which one was talking.
  const markdown = contextMarkdown([
    message("asked", { seq: 1, fromUser: true }),
    message("answered", { seq: 2 }),
    message("asked again", { seq: 3, fromUser: true }),
  ]);
  assert.equal(markdown, "> asked\n\nanswered\n\n> asked again");
});

test("a multi-paragraph user message stays one quote", () => {
  // A bare blank line ends the quote, so the message would arrive as two
  // blocks with a gap between them.
  assert.equal(
    contextMarkdown([message("first\n\nsecond", { fromUser: true })]),
    "> first\n>\n> second",
  );
});

test("consecutive user messages are one quote, not several", () => {
  const markdown = contextMarkdown([
    message("asked", { seq: 1, fromUser: true }),
    message("and also", { seq: 2, fromUser: true }),
  ]);
  assert.equal(markdown, "> asked\n>\n> and also");
});

test("a user's own quote nests inside the turn's", () => {
  assert.equal(
    contextMarkdown([message("> as you said\n\nno", { fromUser: true })]),
    "> > as you said\n>\n> no",
  );
});

test("a user's fenced code is quoted with the rest of the message", () => {
  assert.equal(
    contextMarkdown([
      message("run\n\n```sh\nnpm test\n```", { fromUser: true }),
    ]),
    "> run\n>\n> ```sh\n> npm test\n> ```",
  );
});

test("one speaker's consecutive messages are not broken apart", () => {
  // A reply split by a tool call arrives as several messages, each numbered
  // separately. Marking between them cut single replies into what looked like
  // a conversation.
  const markdown = contextMarkdown([
    message("thinking", { seq: 1 }),
    message("still thinking", { seq: 2 }),
    message("done", { seq: 3 }),
  ]);
  assert.equal(markdown, "thinking\n\nstill thinking\n\ndone");
});

test("surrounding whitespace is trimmed off each message", () => {
  const markdown = contextMarkdown([
    message("\n\nfirst\n\n", { seq: 1, fromUser: true }),
    message("second\n", { seq: 2 }),
  ]);
  assert.equal(markdown, "> first\n\nsecond");
});

test("a message that is only whitespace leaves no empty quote behind", () => {
  const markdown = contextMarkdown([
    message("asked", { seq: 1, fromUser: true }),
    message("   \n  ", { seq: 2 }),
    message("asked again", { seq: 3, fromUser: true }),
  ]);
  // Dropped before the joining, so the two user turns meet as one.
  assert.equal(markdown, "> asked\n>\n> asked again");
});

test("headings are demoted to the text they carry", () => {
  // A message that opens with a heading is a sentence someone marked up, and
  // set in display type it fills the pane on its own.
  assert.equal(
    contextMarkdown([message("# Redesign the icon")]),
    "Redesign the icon",
  );
  assert.equal(contextMarkdown([message("###### deep")]), "deep");
  // Blank lines either side, because stripping the marker alone folded the
  // heading into the prose above and below it as one run-on paragraph.
  assert.equal(
    contextMarkdown([message("a\n## mid-message\nb")]),
    "a\n\nmid-message\n\nb",
  );
  // The closing run of an ATX heading is syntax, not text.
  assert.equal(contextMarkdown([message("## Setup ##")]), "Setup");
});

test("an underlined heading is demoted too", () => {
  // Setext spells the same thing, and left alone it renders as a full-width
  // h1, the outcome demotion exists to prevent.
  assert.equal(
    contextMarkdown([message("Redesign the command\n=====\n\nthen ship it")]),
    "Redesign the command\n\nthen ship it",
  );
  // With a blank line above, the same characters are a thematic break.
  assert.equal(
    contextMarkdown([message("above\n\n---\n\nbelow")]),
    "above\n\n---\n\nbelow",
  );
});

test("a fence is closed by its own character, at its own length", () => {
  // Transcripts about markdown nest fences, and a toggle blind to the
  // character let an inner ~~~ end an outer ``` block, stripping the # from
  // lines that were code.
  const text = "````md\n```\n# Title\n```\n````\n\n# Real heading";
  assert.equal(
    contextMarkdown([message(text)]),
    "````md\n```\n# Title\n```\n````\n\nReal heading",
  );
});

test("a fence left open is closed, so it cannot swallow what follows", () => {
  // corpus.ts truncates long messages at a character count that knows nothing
  // about fences. One open fence renders every later message as a single code
  // block.
  const markdown = contextMarkdown([
    message("here it is:\n\n```ts\nconst a = 1;\n…", { seq: 1 }),
    message("thanks", { seq: 2, fromUser: true }),
  ]);
  assert.equal(
    markdown,
    "here it is:\n\n```ts\nconst a = 1;\n…\n```\n\n> thanks",
  );
});

test("a hash that is not a heading survives demotion", () => {
  assert.equal(contextMarkdown([message("#hashtag")]), "#hashtag");
  assert.equal(contextMarkdown([message("issue #12")]), "issue #12");
});

test("a hash inside a code fence is a comment, not a heading", () => {
  const text =
    "```sh\n# build it\nnpm run build\n```\n\n# But this is a heading";
  assert.equal(
    contextMarkdown([message(text)]),
    "```sh\n# build it\nnpm run build\n```\n\nBut this is a heading",
  );
});

test("other markdown is left alone by heading demotion", () => {
  const text = "- one\n- two\n\n> quoted\n\n**bold**";
  assert.equal(contextMarkdown([message(text)]), text);
});

test("re-marking a rendered pane does not run the image pass again", () => {
  // Why the two steps are separate: the query changes on every keystroke and
  // the messages behind it do not, so marking must not re-run the image pass,
  // which probes the filesystem for every marker it finds.
  const file = join(DIR, "shot.png");
  // A PNG signature and IHDR, which is all the sizing reads.
  const png = Buffer.alloc(24);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  png.writeUInt32BE(13, 8);
  png.write("IHDR", 12, "latin1");
  png.writeUInt32BE(1200, 16);
  png.writeUInt32BE(800, 20);
  writeFileSync(file, png);

  const rendered = renderPane([message(`shot [Image: source: ${file}] ripgrep`)]);
  assert.match(rendered[0].text, /!\[\]\(file:\/\//);

  // With the paste swept, a pass that resolved the marker afresh would leave
  // the sentence as written; every mark still yields the embed.
  rmSync(file);
  for (const words of [["ripgrep"], ["shot"], []])
    assert.match(paneMarkdown(rendered, undefined, words), /!\[\]\(file:\/\//);
});

test("with no messages the pane falls back to the flattened chunk", () => {
  // Escaped, because flattening already destroyed whatever markup it had.
  assert.equal(
    contextMarkdown([], "the **ripgrep** sweep"),
    String.raw`the \*\*ripgrep\*\* sweep`,
  );
});

test("with neither messages nor a fallback the pane is empty", () => {
  assert.equal(contextMarkdown([]), "");
});

test("the query's words are marked in the transcript", () => {
  assert.equal(
    contextMarkdown([message("the ripgrep sweep")], undefined, {
      words: ["ripgrep"],
    }),
    "the <ins>**ripgrep**</ins> sweep",
  );
});

test("the fallback chunk is marked before it is escaped", () => {
  // Escaping first would put a backslash inside `_sweep_`, and the word the
  // query matched would no longer be there to find.
  assert.equal(
    contextMarkdown([], "the ripgrep _sweep_", { words: ["_sweep_"] }),
    String.raw`the ripgrep <ins>**\_sweep\_**</ins>`,
  );
});

test("a query the pane holds whole is marked whole, across messages", () => {
  // The phrase in the first message is the hit; a word mark on the `the`
  // inside the second's `then` would be noise about it.
  assert.equal(
    contextMarkdown(
      [message("what the sweep saw"), message("and then some")],
      undefined,
      { words: ["what", "the"] },
    ),
    "<ins>**what the**</ins> sweep saw\n\nand then some",
  );
});

test("the fallback chunk gets the same phrase preference", () => {
  assert.equal(
    contextMarkdown([], "what the sweep saw then", {
      words: ["what", "the"],
    }),
    "<ins>**what the**</ins> sweep saw then",
  );
});

test("the fallback is the matched chunk, or the title when nothing matched", () => {
  const s = session({ title: "Fix the retention bug" });
  assert.equal(
    fallbackText(s, { ...hit(1, 7), text: "matched chunk" }),
    "matched chunk",
  );
  assert.equal(fallbackText(s), "Fix the retention bug");
});

test("an untitled session falls back to its id, as the row does", () => {
  assert.equal(fallbackText(session({ title: "", id: "abc" })), "abc");
});

test("the header is one bold line of path and time", () => {
  const s = session({ cwd: "/tmp/scratch", mtimeMs: Date.UTC(2026, 7, 4, 12) });
  const header = sessionHeader(s);
  assert.ok(!header.includes("\n"), `header wrapped: ${header}`);
  assert.match(header, /^\*\*`\/tmp\/scratch` · .+\*\*$/);
  // The agent is on the row's icon instead.
  assert.doesNotMatch(header, /Claude|Codex/);
  // Every locale's combined date-time form puts a comma in, and at this length
  // the punctuation reads as a third field.
  assert.doesNotMatch(header, /,/);
});

test("the header writes a home path relative to home", () => {
  // The prefix is identical on every row and the pane is narrow enough to
  // truncate away the part that is not.
  const s = session({ cwd: join(homedir(), "code", "pixie") });
  assert.match(sessionHeader(s), /^\*\*`~\/code\/pixie`/);
});

test("a path too wide for the pane is elided rather than wrapped", () => {
  // A wrapped code span draws its box on both lines and the boxes overlap,
  // markdown owning the line height.
  const cwd = join(
    homedir(),
    "code/unsettled/.claude/worktrees/obj8-second-settlement-grant",
  );
  const header = sessionHeader(session({ cwd }));
  assert.match(header, /^\*\*`~\/code\/[^`]*obj8-second-settlement-grant` · /);
  // The stamp shares the line, so the path is measured against what it leaves.
  const parts = /^\*\*`([^`]+)`( · [^`]+)\*\*$/.exec(header);
  assert.ok(parts, `no header shape in ${header}`);
  const [, span, rest] = parts;
  assert.ok(
    span.length <= headerPathChars(rest),
    `${span} left no room for ${rest}`,
  );
});

test("markup in a path stays literal, the code span having made it so", () => {
  const s = session({ cwd: "/tmp/a_b_c" });
  assert.match(sessionHeader(s), /^\*\*`\/tmp\/a_b_c`/);
});

test("a backtick in a path cannot break out of the code span", () => {
  // Legal in a directory name, and a single-backtick delimiter closed on it,
  // spilling the rest of the path out as bold prose.
  const header = sessionHeader(session({ cwd: "/tmp/we`ird" }));
  assert.match(header, /^\*\*``\/tmp\/we`ird`` · /);
});

test("a session with no working directory still gets a header", () => {
  // Three of these exist in a real manifest, and an empty code span renders as
  // a pair of literal backticks.
  const header = sessionHeader(session({ cwd: "", project: "pixie" }));
  assert.match(header, /^\*\*`pixie` · /);
  const nameless = sessionHeader(session({ cwd: "", project: "", id: "abc" }));
  assert.match(nameless, /^\*\*`abc` · /);
});
