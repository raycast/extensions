import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { embedImages, findPaths } from "../src/lib/links";
import { normalizeSeparators } from "../src/lib/paths";

/** Stands in for the filesystem, so a test names exactly which files exist. */
function files(...paths: string[]) {
  const set = new Set(paths);
  return (path: string) => set.has(path);
}

/** Every path is a file, for tests about what the *matcher* accepts. */
const ANY = () => true;

/** Stands in for the directory tree a relative path is searched through. */
function dirs(tree: Record<string, string[]>) {
  return (dir: string) => tree[dir] ?? [];
}

const CWD = "/root/project";

/**
 * Every image fits the pane, so the tests about *what* is rewritten read
 * without a size query; sizing has its own tests below.
 */
const FITS = () => 100;

/** These fixtures are POSIX paths read by POSIX rules, whatever the host is. */
const POSIX = false;

// Every helper pins the platform rather than inheriting it. These fixtures are
// POSIX paths against POSIX expectations, so on a Windows host they would
// otherwise be read by the Windows patterns and assert nothing they mean.
function embed(text: string, ...paths: string[]) {
  return embedImages(
    text,
    { cwd: CWD, isFile: files(...paths), pixelWidth: FITS },
    POSIX,
  );
}

function found(text: string, ...paths: string[]) {
  return findPaths(text, { cwd: CWD, isFile: files(...paths) }, POSIX);
}

function foundIn(
  text: string,
  tree: Record<string, string[]>,
  ...paths: string[]
) {
  return findPaths(
    text,
    { cwd: CWD, isFile: files(...paths), listDirs: dirs(tree) },
    POSIX,
  );
}

test("a pasted image renders as the image", () => {
  assert.equal(
    embed(
      "what are these icons? [Image: source: /tmp/paste-1.png]",
      "/tmp/paste-1.png",
    ),
    "what are these icons? ![](file:///tmp/paste-1.png)",
  );
});

/** Embeds one marker with `width` reported for the file it names. */
function sized(width: number | null) {
  return embedImages("[Image: source: /tmp/paste-1.png]", {
    cwd: CWD,
    isFile: files("/tmp/paste-1.png"),
    pixelWidth: () => width,
  });
}

test("an image wider than the pane is drawn at the pane's width", () => {
  // Raycast fits an image to the pane by itself, but not inside a blockquote,
  // where every user message is set: a retina paste drawn at its own size there
  // runs several times the pane's width.
  assert.equal(sized(1500), "![](file:///tmp/paste-1.png?raycast-width=350)");
});

test("an image narrower than the pane is left at its own size", () => {
  assert.equal(sized(120), "![](file:///tmp/paste-1.png)");
  // The boundary is the pane's width itself, which needs no constraining.
  assert.equal(sized(350), "![](file:///tmp/paste-1.png)");
});

test("an image whose width cannot be read is capped", () => {
  // WebP and SVG, which the measure does not decode.
  assert.equal(sized(null), "![](file:///tmp/paste-1.png?raycast-width=350)");
});

test("an image marker whose file is gone stays readable text", () => {
  // Temp pastes are swept within days, so most markers in older transcripts
  // point at nothing; an embed would render as a broken image.
  const text = "look [Image: source: /tmp/paste-1.png]";
  assert.equal(embed(text), text);
});

test("an image marker naming no path is left alone", () => {
  // Asserted with every path existing: the marker has to be rejected for naming
  // a bare filename, not because nothing was on disk. Embedding it produced a
  // relative `file://` URL resolved against the extension's own directory.
  const text = "[Image: source: Screenshot 2026-07-23 at 12.33.30 AM.png]";
  assert.equal(embedImages(text, { cwd: CWD, isFile: ANY }), text);
  assert.equal(
    embedImages("[Image: source: ~]", { isFile: ANY }),
    "[Image: source: ~]",
  );
});

test("a marker's source is read without the space around it", () => {
  assert.equal(
    embed("[Image: source:  /tmp/p.png ]", "/tmp/p.png"),
    "![](file:///tmp/p.png)",
  );
});

test("a marker naming something that is not an image stays as text", () => {
  // It used to become a link. Nothing in the pane can follow one, so the
  // sentence is left saying what it said.
  const text = "[Image: source: /tmp/notes.md]";
  assert.equal(embed(text, "/tmp/notes.md"), text);
});

test("a path in prose is never rewritten", () => {
  // The whole point of the module's retreat: a markdown link here would render,
  // style as a link, and do nothing at all when clicked.
  const text = "the fix is in /tmp/a.ts and `/tmp/a.ts` both";
  assert.equal(embed(text, "/tmp/a.ts"), text);
});

test("a parenthesis in a marker's source is encoded in the url", () => {
  // Unescaped, it closes the embed's URL early.
  assert.equal(
    embed("[Image: source: /tmp/shot(1).png]", "/tmp/shot(1).png"),
    "![](file:///tmp/shot%281%29.png)",
  );
});

test("a markup-bearing character in a path is encoded in the url", () => {
  assert.equal(
    embed("[Image: source: /tmp/100%/a.png]", "/tmp/100%/a.png"),
    "![](file:///tmp/100%25/a.png)",
  );
});

test("a marker quoted inside code is discussed, not displayed", () => {
  const fenced = "```\n[Image: source: /tmp/p.png]\n```";
  assert.equal(embed(fenced, "/tmp/p.png"), fenced);
  assert.equal(
    embed("`[Image: source: /tmp/p.png]`", "/tmp/p.png"),
    "`[Image: source: /tmp/p.png]`",
  );
});

/** A marker and the embed it becomes, so the structure tests read as one line. */
const P = "/tmp/p.png";
const MARKER = `[Image: source: ${P}]`;
const EMBED = "![](file:///tmp/p.png)";

test("a nested fence does not close the block around it", () => {
  // Transcripts that quote markdown wrap fences in longer fences constantly; a
  // toggle blind to the run length rewrote the code inside them.
  assert.equal(
    embed(`\`\`\`\`md\n\`\`\`\n${MARKER}\n\`\`\`\n\`\`\`\`\n${MARKER}`, P),
    `\`\`\`\`md\n\`\`\`\n${MARKER}\n\`\`\`\n\`\`\`\`\n${EMBED}`,
  );
});

test("a fence is closed only by its own character", () => {
  // A `~~~` line inside a ``` block closes nothing.
  assert.equal(
    embed(`\`\`\`md\n~~~\n${MARKER}\n\`\`\`\n${MARKER}`, P),
    `\`\`\`md\n~~~\n${MARKER}\n\`\`\`\n${EMBED}`,
  );
});

test("a fence inside a blockquote still marks code", () => {
  // The quote markers are stripped before the line is judged, or `> ``` ` is
  // read as prose and the block never opens.
  const quoted = `> \`\`\`\n> ${MARKER}\n> \`\`\``;
  assert.equal(embed(quoted, P), quoted);
});

test("an indented code block is code, an indented continuation is not", () => {
  const block = `text\n\n    ${MARKER}\n\nafter`;
  assert.equal(embed(block, P), block);
  // No blank line above, so the indent is a wrapped line of the paragraph.
  assert.equal(embed(`text\n    ${MARKER}`, P), `text\n    ${EMBED}`);
});

test("a link reference definition is left alone", () => {
  // Its target is already a URL; rewriting there produces a definition that
  // points at markup rather than a link.
  const definition = `[1]: ${MARKER}`;
  assert.equal(embed(definition, P), definition);
});

test("a marker already inside other syntax is left alone", () => {
  // Rewriting here nests markup inside markup, which renders as neither.
  for (const text of [
    `<img src="${MARKER}">`,
    `[the shot](${MARKER})`,
    `<${MARKER}>`,
  ])
    assert.equal(embed(text, P), text);
});

test("prose with no markers in it is returned unchanged", () => {
  const text = "The indexer folds each transcript into corpus.txt, then stops.";
  assert.equal(embed(text), text);
});

test("an absolute path that exists is found", () => {
  assert.deepEqual(found("edit /tmp/a.ts now", "/tmp/a.ts"), ["/tmp/a.ts"]);
});

test("a home path is probed expanded", () => {
  const file = join(homedir(), "code", "notes.md");
  assert.deepEqual(found("~/code/notes.md", file), [file]);
});

test("a path that is not on disk is not offered", () => {
  assert.deepEqual(found("see /tmp/gone.png"), []);
});

test("directories are never offered", () => {
  // Run against a real tree. An injected `isFile` cannot test this at all: the
  // rule lives in the on-disk probe, and a stub that answers false for a
  // directory asserts nothing, since it answers false for everything.
  //
  // `orca file open` accepts a directory, opens it as a text buffer and reports
  // success, so nothing downstream can tell the difference. Transcripts name
  // directories in every `cd`, so the probe has to be narrower than existence.
  const root = mkdtempSync(join(tmpdir(), "links-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "a.ts"), "");
    assert.deepEqual(
      findPaths(`look in ${root}/src for it`, { cwd: root }),
      [],
    );
    // The file beside it, to show the probe is not simply rejecting everything.
    assert.deepEqual(findPaths(`open ${root}/src/a.ts`, { cwd: root }), [
      join(root, "src", "a.ts"),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("paths inside code are found, unlike anything the pane rewrites", () => {
  // Transcripts write most of their paths in backticks or inside a diff, and a
  // path is no less real for being quoted. Nothing here nests markup.
  assert.deepEqual(
    found(
      "run `cat /tmp/a.ts`\n```sh\nvim /tmp/b.ts\n```",
      "/tmp/a.ts",
      "/tmp/b.ts",
    ),
    ["/tmp/a.ts", "/tmp/b.ts"],
  );
});

test("a file named twice is offered once, in the order first named", () => {
  assert.deepEqual(
    found("/tmp/b.ts then /tmp/a.ts then /tmp/b.ts", "/tmp/a.ts", "/tmp/b.ts"),
    ["/tmp/b.ts", "/tmp/a.ts"],
  );
});

test("sentence punctuation is not part of the path", () => {
  assert.deepEqual(found("it is in /tmp/a.ts.", "/tmp/a.ts"), ["/tmp/a.ts"]);
  assert.deepEqual(found("(see /tmp/a.ts)", "/tmp/a.ts"), ["/tmp/a.ts"]);
});

test("a trailing path segment of dots is not sentence punctuation", () => {
  // Stripping `..` as a full stop named the parent of what the text said.
  assert.deepEqual(found("cd /root/code/..", "/root/code/"), []);
});

test("a path is not found from a prefix of itself", () => {
  // Everything exists here, so only the match's own boundary can reject these.
  assert.deepEqual(findPaths("open /root//a.ts", { isFile: ANY }), []);
  // `corpus.ts` truncates a long message with an ellipsis, mid-path.
  assert.deepEqual(findPaths("open /root/src…", { isFile: ANY }), []);
});

test("prose that merely contains a slash is never a path", () => {
  // Asserted with everything existing, so only the matcher can reject these.
  // None has a dotted last segment, which is all that separates prose from a
  // bare relative path cheaply enough to run on every slash in a transcript.
  assert.deepEqual(
    findPaths("either and/or, 24/7, read/write", { cwd: CWD, isFile: ANY }),
    [],
  );
  // `%` is in the path class, so the lookbehind has to list it too.
  assert.deepEqual(
    findPaths("at 100%/tmp done", { cwd: CWD, isFile: ANY }),
    [],
  );
});

test("a non-ascii filename is matched whole", () => {
  const file = "/root/Downloads/скрин.png";
  assert.deepEqual(found(`open ${file} now`, file), [file]);
});

test("a bare relative path resolves against the session directory", () => {
  const file = `${CWD}/src/lib/links.ts`;
  assert.deepEqual(foundIn("edit src/lib/links.ts now", {}, file), [file]);
});

test("a relative path is searched two directories deep", () => {
  // The monorepo case: an agent writes `src/lib/a.ts` while the session's cwd
  // is the repo root and the file lives under a package.
  const file = `${CWD}/extensions/ext/src/lib/a.ts`;
  assert.deepEqual(
    foundIn(
      "src/lib/a.ts",
      { [CWD]: ["extensions"], [`${CWD}/extensions`]: ["ext"] },
      file,
    ),
    [file],
  );
});

test("a relative path matching two places is dropped", () => {
  // A monorepo has an `src/index.ts` under every package and the transcript
  // gives no way to tell which was meant. A wrong file is worse than none.
  assert.deepEqual(
    foundIn(
      "src/index.ts",
      { [CWD]: ["a", "b"] },
      `${CWD}/a/src/index.ts`,
      `${CWD}/b/src/index.ts`,
    ),
    [],
  );
});

test("a relative path with no extension is never probed", () => {
  // Asserted with every path existing: the token has to be rejected for its
  // shape, or every `either/or` in a transcript costs a filesystem walk.
  assert.deepEqual(
    findPaths("bin/setup", { cwd: CWD, isFile: ANY, listDirs: dirs({}) }),
    [],
  );
});

test("without a session directory a relative path is not resolved", () => {
  assert.deepEqual(findPaths("src/lib/links.ts", { isFile: ANY }), []);
});

test("build and package trees are never searched", () => {
  // Run against a real tree, because the exclusion lives in the on-disk lister
  // that the injected one replaces everywhere else. node_modules holds
  // thousands of plausible matches no transcript ever means.
  const root = mkdtempSync(join(tmpdir(), "links-"));
  try {
    mkdirSync(join(root, "node_modules", "pkg", "src"), { recursive: true });
    writeFileSync(join(root, "node_modules", "pkg", "src", "a.ts"), "");
    mkdirSync(join(root, "pkg", "src"), { recursive: true });
    writeFileSync(join(root, "pkg", "src", "b.ts"), "");

    assert.deepEqual(findPaths("src/a.ts", { cwd: root }), []);
    // The same shape one directory over, to show the walk itself works.
    assert.deepEqual(findPaths("src/b.ts", { cwd: root }), [
      join(root, "pkg", "src", "b.ts"),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * The Windows half. Every case names the platform explicitly, so what is under
 * test is the branch the case is about rather than the one the host happens to
 * run — and so the POSIX cases above keep asserting POSIX behaviour when the
 * suite runs on Windows.
 */
const WIN = "C:\\code\\pixie";

function winFound(text: string, ...paths: string[]) {
  return findPaths(
    text,
    { cwd: WIN, isFile: files(...paths), listDirs: dirs({}) },
    true,
  );
}

function winFoundIn(
  text: string,
  tree: Record<string, string[]>,
  ...paths: string[]
) {
  return findPaths(
    text,
    { cwd: WIN, isFile: files(...paths), listDirs: dirs(tree) },
    true,
  );
}

/** Everything exists, so only the matcher and the platform can reject a case. */
function winAny(text: string) {
  return findPaths(text, { cwd: WIN, isFile: ANY, listDirs: dirs({}) }, true);
}

function winEmbed(text: string, ...paths: string[]) {
  return embedImages(
    text,
    { cwd: WIN, isFile: files(...paths), pixelWidth: FITS },
    true,
  );
}

test("a drive-letter path is found in either spelling", () => {
  // The bug this suite was written for: neither shape is rooted by `/`, so both
  // fell through to the relative resolver and were rejected there for holding a
  // colon. The open-file submenu was empty on Windows for every transcript.
  const back = "C:\\code\\pixie\\src\\main.ts";
  assert.deepEqual(winFound(`edit ${back} now`, back), [back]);
  // Probed as the transcript spelled it, returned in the one spelling: the
  // same file named both ways in one transcript has to come back as one row.
  const forward = "C:/code/pixie/src/main.ts";
  assert.deepEqual(winFound(`edit ${forward} now`, forward), [back]);
});

test("one file named in both spellings is one row, not two", () => {
  const text =
    "edit C:/code/pixie/src/main.ts, then C:\\code\\pixie\\src\\main.ts";
  assert.deepEqual(
    winFound(
      text,
      "C:/code/pixie/src/main.ts",
      "C:\\code\\pixie\\src\\main.ts",
    ),
    ["C:\\code\\pixie\\src\\main.ts"],
  );
});

test("a UNC path names the file on the share", () => {
  const file = "\\\\nas\\shots\\a.png";
  assert.deepEqual(winFound(`see ${file} now`, file), [file]);
});

test("a home path is probed expanded in either spelling", () => {
  // `expandTilde` takes the backslash a Windows shell and Explorer both write.
  // The expectation is respelled because the fixture is built with the host's
  // `join`: on a Mac that yields a POSIX home, which the Windows branch settles
  // into one spelling on its way out, exactly as it would a real `C:\Users\...`.
  const file = join(homedir(), "code\\notes.md");
  assert.deepEqual(winFound("~\\code\\notes.md", file), [
    normalizeSeparators(file, true),
  ]);
});

test("a backslash relative path resolves against the session directory", () => {
  const file = `${WIN}\\src\\lib\\links.ts`;
  assert.deepEqual(winFoundIn("edit src\\lib\\links.ts now", {}, file), [file]);
});

test("a relative path is resolved into the platform's own spelling", () => {
  // Agents write forward slashes on Windows constantly, and the result is handed
  // to an editor and shown to a person; one spelling per path is what they read.
  const file = `${WIN}\\src\\lib\\links.ts`;
  assert.deepEqual(winFoundIn("edit src/lib/links.ts now", {}, file), [file]);
});

test("a session at a drive root gains no second separator", () => {
  // `C:\` already ends in one, and `C:\\src\a.ts` reads as the start of a UNC
  // name rather than as a path on the drive.
  const file = "C:\\src\\a.ts";
  assert.deepEqual(
    findPaths(
      "src\\a.ts",
      { cwd: "C:\\", isFile: files(file), listDirs: dirs({}) },
      true,
    ),
    [file],
  );
});

test("a windows relative path is searched two directories deep", () => {
  const file = `${WIN}\\extensions\\ext\\src\\lib\\a.ts`;
  assert.deepEqual(
    winFoundIn(
      "src\\lib\\a.ts",
      { [WIN]: ["extensions"], [`${WIN}\\extensions`]: ["ext"] },
      file,
    ),
    [file],
  );
});

test("a windows relative path matching two places is dropped", () => {
  assert.deepEqual(
    winFoundIn(
      "src\\index.ts",
      { [WIN]: ["a", "b"] },
      `${WIN}\\a\\src\\index.ts`,
      `${WIN}\\b\\src\\index.ts`,
    ),
    [],
  );
});

test("a windows path is not found from a prefix of itself", () => {
  // A second separator means the segment between them held a character the
  // class rejects, so the match is a prefix and a prefix names the wrong file.
  assert.deepEqual(
    findPaths("open C:\\code\\\\a.ts", { isFile: ANY }, true),
    [],
  );
  // `corpus.ts` truncates a long message with an ellipsis, mid-path.
  assert.deepEqual(findPaths("open C:\\code\\src…", { isFile: ANY }, true), []);
});

test("a drive with nothing after it is not a path", () => {
  assert.deepEqual(winAny("on C: and C:\\ both"), []);
});

test("a backslash escape in prose is not a rooted path", () => {
  // `\n` and `\t` are everywhere in transcripts, and a rooted match skips the
  // dotted-tail rule, so it would be probed on sight. The other two are the
  // bare shape, which that rule catches.
  assert.deepEqual(winAny("split on \\n then read\\write, 24\\7"), []);
});

test("a windows relative path with no dotted tail is never probed", () => {
  // Asserted with every path existing: the token has to be rejected for its
  // shape, or every `either\or` in a transcript costs a filesystem walk.
  assert.deepEqual(winAny("bin\\setup"), []);
  // The dot is in an earlier segment. A tail rule blind to the backslash reads
  // `.or\then` as an extension and buys the walk it exists to avoid.
  assert.deepEqual(winAny("either.or\\then"), []);
});

test("directories are never offered on windows either", () => {
  // Run against a real tree, as its POSIX twin is: the rule lives in the
  // on-disk probe, and an injected `isFile` cannot test it at all. The paths are
  // built with `join`, so this reads a drive-letter tree on Windows and a POSIX
  // one elsewhere — both of which the Windows matcher has to accept.
  const root = mkdtempSync(join(tmpdir(), "links-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "a.ts"), "");
    const dir = join(root, "src");
    assert.deepEqual(
      findPaths(`look in ${dir} for it`, { cwd: root }, true),
      [],
    );
    const file = join(root, "src", "a.ts");
    assert.deepEqual(findPaths(`open ${file}`, { cwd: root }, true), [
      normalizeSeparators(file, true),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a windows path on macos names nothing", () => {
  // Asserted with every path existing, so only the platform branch can reject
  // these. A backslash is a legal filename character on macOS, and reading one
  // as a separator would name a file the text never mentioned.
  assert.deepEqual(
    findPaths(
      "open C:\\code\\pixie\\src\\main.ts",
      { cwd: CWD, isFile: ANY, listDirs: dirs({}) },
      false,
    ),
    [],
  );
  assert.deepEqual(
    findPaths(
      "edit src\\lib\\links.ts",
      { cwd: CWD, isFile: ANY, listDirs: dirs({}) },
      false,
    ),
    [],
  );
});

test("a drive-letter image url has three slashes and an unencoded drive", () => {
  // Percent-encoded, the colon stops naming a drive; split on `/` alone, the
  // whole path became one segment of `%5C` and the pane drew a broken image.
  const embed = "![](file:///C:/Users/aki/shot.png)";
  assert.equal(
    winEmbed(
      "[Image: source: C:\\Users\\aki\\shot.png]",
      "C:\\Users\\aki\\shot.png",
    ),
    embed,
  );
  assert.equal(
    winEmbed("[Image: source: C:/Users/aki/shot.png]", "C:/Users/aki/shot.png"),
    embed,
  );
});

test("a UNC image url puts the server in the host slot", () => {
  // Two slashes, not three: the share's server is the URL's authority.
  assert.equal(
    winEmbed("[Image: source: \\\\nas\\shots\\a.png]", "\\\\nas\\shots\\a.png"),
    "![](file://nas/shots/a.png)",
  );
});

test("a posix path on windows keeps the url it always had", () => {
  assert.equal(
    winEmbed("[Image: source: /tmp/p.png]", "/tmp/p.png"),
    "![](file:///tmp/p.png)",
  );
});

test("a markup-bearing character in a windows path is encoded per segment", () => {
  // Every separator survives, and only the segments are touched.
  assert.equal(
    winEmbed(
      "[Image: source: C:\\tmp\\100%\\shot(1).png]",
      "C:\\tmp\\100%\\shot(1).png",
    ),
    "![](file:///C:/tmp/100%25/shot%281%29.png)",
  );
});

test("a windows marker naming a bare filename is left alone", () => {
  // Asserted with every path existing: the marker is rejected for naming no
  // path, not for missing from disk. Embedded, it produced a relative URL
  // resolved against the extension's own directory.
  const text = "[Image: source: Screenshot 2026-07-23 at 12.33.30 AM.png]";
  assert.equal(embedImages(text, { cwd: WIN, isFile: ANY }, true), text);
});
