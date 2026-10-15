import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { FolderSummary, Status } from "../engine/api";
import type { FileKind, Hit, SegmentKind } from "../engine/types";
import {
  CODE_EXAMPLES,
  MENU_BAR_HINT,
  homeExamples,
  isKindFilter,
  noMatches,
  placeholder,
  setupSubtitle,
  showAllTitle,
  weakerTitle,
  welcomeMarkdown,
} from "../src/lib/copy";
import { CONFIG_FILE, daemonRunning, foldersChosen, elapsedSeconds, isOurDaemon } from "../src/lib/daemon-files";
import { CODE_EDITORS, chooseEditor, launchPlan } from "../src/lib/editors";
import {
  addFolders,
  addSummary,
  extensionsText,
  parseExtensions,
  removeFolder,
  skipFolders,
  unskipFolder,
} from "../src/lib/folder-config";
import {
  codeMarkdown,
  fitIn,
  imageMarkdown,
  passageMarkdown,
  previewMarkdown,
  previewNeeds,
  thumbKey,
  thumbSpec,
} from "../src/lib/preview";
import {
  buildResultSet,
  factsOf,
  folderLabel,
  groupCounts,
  makeRow,
  openTitle,
  resultCount,
  searchWords,
} from "../src/lib/results";
import {
  accessTrouble,
  downloadName,
  downloadRate,
  downloadSecondsLeft,
  folderIndexedText,
  folderStatesText,
  folderTrouble,
  foldersText,
  hoursText,
  indexSummary,
  isBusy,
  kindCountsText,
  menuBarTitle,
  resultsCaveat,
  setupLine,
  setupProgressText,
  startingLine,
  statusDetail,
  statusLine,
  summaryOf,
  troubleTag,
} from "../src/lib/status-text";

const HOME = "/Users/me";
/** Noon on Oct 1, 2026 (local), so the date reads the same in any time zone. */
const OCT_1 = new Date(2026, 9, 1, 12, 0, 0).getTime() / 1000;

let nextId = 1;
function hit(over: Partial<Hit> & { path: string; kind: FileKind; segment?: SegmentKind }): Hit {
  return {
    score: 1,
    z: 3,
    cosine: 0.5,
    keywordRank: null,
    segment: "image",
    segmentId: nextId++,
    loc: null,
    locEnd: null,
    excerpt: null,
    modified: OCT_1,
    size: 0,
    info: {},
    focus: null,
    ...over,
  };
}

const row = (over: Parameters<typeof hit>[0], terms: string[] = []) => makeRow(hit(over), terms, HOME);

describe("ResultRow (DigUp Results.swift)", () => {
  test("a screenshot: name, folder, reason and details", () => {
    const r = row({
      path: `${HOME}/Downloads/Shots/shot_payment_error.png`,
      kind: "screenshot",
      size: 2_100_000,
      info: { width: "1440", height: "900" },
    });
    assert.equal(r.name, "shot_payment_error.png");
    assert.equal(r.title, "‎shot_payment_error.png");
    assert.equal(r.folder, "~/Downloads/Shots");
    assert.equal(r.folderPath, `${HOME}/Downloads/Shots`);
    assert.equal(r.group, "screenshots");
    assert.equal(r.reason, "Matches what's on screen");
    assert.equal(r.details, "Screenshot · Oct 1, 2026 · 1440 × 900 · 2.1 MB");
    assert.equal(r.place, null);
    assert.equal(r.jump, null);
  });

  test("not matched by meaning: words or the name", () => {
    assert.equal(row({ path: "/a/b.jpg", kind: "image", z: 1.2, keywordRank: 1 }).reason, "Has your words");
    assert.equal(row({ path: "/a/b.jpg", kind: "image", z: null }).reason, "Matches its name");
    assert.equal(row({ path: "/a/b.jpg", kind: "image", z: 2 }).reason, "Matches the picture");
  });

  test("a PDF page: badge, reason, page, jump and the read-so-far details", () => {
    const r = row({
      path: "/d/Sailing log 2025.pdf",
      kind: "pdf",
      segment: "page",
      loc: 41,
      size: 23_400_000,
      info: { pages: "120", read_to: "60" },
    });
    assert.equal(r.place, "p. 41");
    assert.equal(r.reason, "Matches the text on page 41");
    assert.equal(r.page, 41);
    assert.equal(r.jump, "p. 41");
    assert.equal(r.details, "PDF · Oct 1, 2026 · 120 pages, 60 read so far · 23 MB");
    const image = row({ path: "/d/Scan.pdf", kind: "pdf", segment: "page_image", loc: 1, info: { pages: "1" } });
    assert.equal(image.reason, "Matches page 1");
    assert.equal(image.jump, null);
    assert.equal(image.details, "PDF · Oct 1, 2026 · 1 page");
  });

  test("video frames, a video's sound and audio: clock badges and moments", () => {
    const frame = row({ path: "/v/zoo.mp4", kind: "video", segment: "frame", loc: 6, info: { duration: "18.0" } });
    assert.equal(frame.place, "0:06");
    assert.equal(frame.reason, "Matches the frame at 0:06");
    assert.equal(frame.moment, 6);
    assert.equal(frame.jump, "0:06");
    assert.equal(frame.details, "Video · Oct 1, 2026 · 0:18");
    const sound = row({ path: "/v/zoo.mp4", kind: "video", segment: "audio", loc: 25, locEnd: 55 });
    assert.equal(sound.place, "♪ 0:25");
    assert.equal(sound.reason, "Matches the sound at 0:25");
    const audio = row({ path: "/a/talk.m4a", kind: "audio", segment: "audio", loc: 3725, locEnd: 3755 });
    assert.equal(audio.place, "1:02:05");
    assert.equal(audio.reason, "Matches what's heard at 1:02:05");
    const start = row({ path: "/a/talk.m4a", kind: "audio", segment: "audio", loc: 0.4 });
    assert.equal(start.jump, null);
  });

  test("documents: chunk reason, OCR, partly read", () => {
    assert.equal(row({ path: "/d/n.md", kind: "doc", segment: "chunk", loc: 2 }).reason, "Matches its text");
    assert.equal(row({ path: "/s.png", kind: "screenshot", segment: "ocr" }).reason, "Matches the text in it");
    assert.equal(
      row({ path: "/d/n.md", kind: "doc", segment: "chunk", loc: 2, info: { read_to: "40" } }).details,
      "Document · Oct 1, 2026 · partly read so far",
    );
  });

  test("code: lines and cells, the repo folder, the line to open at", () => {
    const lines = row({
      path: "/r/code/billing-service/billing/retry.py",
      kind: "code",
      segment: "lines",
      loc: 8,
      locEnd: 29,
      focus: 12,
      size: 2048,
      info: { repo: "/r/code/billing-service", lines: "63" },
    });
    assert.equal(lines.folder, "billing-service/billing");
    assert.equal(lines.place, "L8–29");
    assert.equal(lines.span, "lines 8–29");
    assert.equal(lines.reason, "Matches lines 8–29");
    assert.equal(lines.codeLine, 12);
    assert.equal(lines.details, "Python · 63 lines · Oct 1, 2026 · 2 KB");
    const one = row({ path: "/r/x.swift", kind: "code", segment: "lines", loc: 5, locEnd: 5 });
    assert.equal(one.place, "L5");
    assert.equal(one.codeLine, 5);
    const cells = row({
      path: "/r/nb.ipynb",
      kind: "code",
      segment: "cells",
      loc: 2,
      locEnd: 5,
      info: { cells: "1" },
    });
    assert.equal(cells.place, "cells 2–5");
    assert.equal(cells.reason, "Matches cells 2–5");
    assert.equal(cells.codeLine, 1);
    assert.equal(cells.details, "Notebook · 1 cell · Oct 1, 2026");
  });

  test("folderLabel keeps a tilde path when the repo doesn't hold the file", () => {
    assert.equal(folderLabel({ path: `${HOME}/x/y.py`, kind: "code", info: { repo: "/elsewhere" } }, HOME), "~/x");
    assert.equal(folderLabel({ path: "/repo/a.py", kind: "code", info: { repo: "/repo" } }, HOME), "repo");
  });

  test("foundWords come from the « » marks; search words add the query's terms", () => {
    const r = row(
      { path: "/d/a.pdf", kind: "pdf", segment: "page", loc: 2, excerpt: "the «Yoshida» trail on «Fuji»" },
      ["fuji", "yoshida", "climbing"],
    );
    assert.deepEqual(r.foundWords, ["Yoshida", "Fuji"]);
    assert.deepEqual(searchWords(r), ["Yoshida", "Fuji", "fuji", "yoshida", "climbing"]);
  });

  test("openTitle names the place, the editor and the line", () => {
    const page = row({ path: "/d/a.pdf", kind: "pdf", segment: "page", loc: 3 });
    assert.equal(openTitle(page), "Open at p. 3");
    const first = row({ path: "/d/a.pdf", kind: "pdf", segment: "page", loc: 1 });
    assert.equal(openTitle(first), "Open");
    const moment = row({ path: "/v/a.mp4", kind: "video", segment: "frame", loc: 6 });
    assert.equal(openTitle(moment, { jumpsToMoments: true }), "Open at 0:06");
    assert.equal(openTitle(moment, { jumpsToMoments: false }), "Open");
    // A video's sound: the badge says ♪, the title only the time (DigUp Moments.swift openTitle).
    const sound = row({ path: "/v/a.mp4", kind: "video", segment: "audio", loc: 25, locEnd: 55 });
    assert.equal(sound.place, "♪ 0:25");
    assert.equal(openTitle(sound, { jumpsToMoments: true }), "Open at 0:25");
    const code = row({ path: "/r/a.ts", kind: "code", segment: "lines", loc: 10, locEnd: 30, focus: 12 });
    assert.equal(openTitle(code, { editor: "Zed" }), "Open in Zed at line 12");
    assert.equal(openTitle(code, { editor: null }), "Open");
    const cells = row({ path: "/r/a.ipynb", kind: "code", segment: "cells", loc: 1 });
    assert.equal(openTitle(cells, { editor: "Cursor" }), "Open in Cursor");
  });

  test("factsOf labels the details", () => {
    const r = row({
      path: "/d/a.pdf",
      kind: "pdf",
      segment: "page",
      loc: 3,
      size: 2_000_000,
      info: { pages: "463", read_to: "120" },
    });
    assert.deepEqual(factsOf(r), [
      { title: "Kind", text: "PDF" },
      { title: "Pages", text: "463, 120 read so far" },
      { title: "Size", text: "2 MB" },
    ]);
    const code = row({ path: "/r/a.py", kind: "code", segment: "lines", loc: 1, info: { lines: "1200" } });
    assert.deepEqual(factsOf(code), [
      { title: "Language", text: "Python" },
      { title: "Lines", text: "1,200" },
    ]);
  });
});

describe("ResultSet (DigUp Results.swift:211-235)", () => {
  const hits = [
    hit({ path: "/p/1.png", kind: "screenshot", score: 10 }),
    hit({ path: "/p/2.pdf", kind: "pdf", score: 9 }),
    hit({ path: "/p/3.png", kind: "screenshot", score: 8 }),
    hit({ path: "/p/4.txt", kind: "doc", score: 7 }),
    hit({ path: "/p/5.jpg", kind: "image", score: 6 }),
    hit({ path: "/p/6.jpg", kind: "image", score: 2 }),
    hit({ path: "/p/7.mp4", kind: "video", score: 1 }),
  ];

  test("strong hits grouped in order of first appearance; the rest folded", () => {
    const set = buildResultSet(hits);
    assert.deepEqual(
      set.groups.map((g) => [g.kind, g.rows.map((r) => r.name), g.total]),
      [
        ["screenshots", ["1.png", "3.png"], 2],
        ["documents", ["2.pdf", "4.txt"], 2],
        ["images", ["5.jpg"], 1],
      ],
    );
    assert.deepEqual(
      set.ranked.map((r) => r.name),
      ["1.png", "2.pdf", "3.png", "4.txt", "5.jpg"],
    );
    assert.deepEqual(
      set.weaker.map((r) => r.name),
      ["6.jpg", "7.mp4"],
    );
    assert.equal(resultCount(set), "5 results · 2 weaker");
    assert.deepEqual(groupCounts(set), { screenshots: 2, documents: 2, images: 1 });
  });

  test("the response's strong count wins, and rows per group cap what's shown", () => {
    const set = buildResultSet(hits, { strong: 3, rowsPerGroup: 1 });
    assert.deepEqual(
      set.groups.map((g) => [g.kind, g.rows.length, g.total]),
      [
        ["screenshots", 1, 2],
        ["documents", 1, 1],
      ],
    );
    assert.equal(set.weaker.length, 4);
    assert.equal(resultCount(buildResultSet(hits.slice(0, 1))), "1 result");
  });

  test("everything is strong when the top score isn't positive; nothing when there are no hits", () => {
    const flat = [hit({ path: "/a", kind: "image", score: 0 }), hit({ path: "/b", kind: "image", score: -1 })];
    assert.equal(buildResultSet(flat).weaker.length, 0);
    assert.deepEqual(buildResultSet([]), { groups: [], ranked: [], weaker: [] });
  });
});

describe("previews (DigUp Previews.swift)", () => {
  test("what each kind needs from the daemon", () => {
    assert.deepEqual(previewNeeds(row({ path: "/a.png", kind: "image" })), { thumb: true, text: null });
    assert.deepEqual(previewNeeds(row({ path: "/a.md", kind: "doc", segment: "chunk", loc: 1 })), {
      thumb: false,
      text: "passage",
    });
    assert.deepEqual(previewNeeds(row({ path: "/a.py", kind: "code", segment: "lines", loc: 1 })), {
      thumb: false,
      text: "code",
    });
  });

  test("thumbSpec asks for the page with its words, the frame, the waveform's stretch", () => {
    const page = row({ path: "/d/a.pdf", kind: "pdf", segment: "page", loc: 2, excerpt: "«Yoshida» x" }, [
      "yoshida",
      "a",
    ]);
    assert.deepEqual(thumbSpec(page, 820, true), {
      path: "/d/a.pdf",
      kind: "pdf",
      maxPixel: 820,
      loc: 2,
      words: ["Yoshida", "yoshida"],
    });
    assert.equal(thumbSpec(page, 96, false).words, undefined);
    const audio = row({ path: "/a.wav", kind: "audio", segment: "audio", loc: 25, locEnd: 55 });
    assert.deepEqual(thumbSpec(audio, 96, false), { path: "/a.wav", kind: "audio", maxPixel: 96, loc: 25, locEnd: 55 });
    assert.notEqual(thumbKey(thumbSpec(page, 820, true)), thumbKey(thumbSpec(page, 96, false)));
  });

  test("pictures fit the pane without being enlarged, and file names are encoded", () => {
    assert.deepEqual(fitIn({ width: 1440, height: 900 }, { width: 410, height: 230 }), { width: 368, height: 230 });
    assert.deepEqual(fitIn({ width: 100, height: 50 }, { width: 410, height: 230 }), { width: 100, height: 50 });
    assert.equal(
      imageMarkdown("/t/a b (1)#.png", { width: 820, height: 410 }),
      "![](file:///t/a%20b%20%281%29%23.png?raycast-width=410&raycast-height=205)",
    );
  });

  test("code: numbered lines, the focus line marked", () => {
    const code = row({ path: "/r/a.py", kind: "code", segment: "lines", loc: 10, locEnd: 12, focus: 11 });
    const md = codeMarkdown(code, "def a():\n    retry()\n    return 1\n");
    assert.equal(md, "```\n  10  def a():\n▶ 11      retry()\n  12      return 1\n```");
  });

  test("code: a long stretch shows a window from just before the focus line", () => {
    const text = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
    const code = row({ path: "/r/a.py", kind: "code", segment: "lines", loc: 1, locEnd: 100, focus: 60 });
    const md = codeMarkdown(code, text);
    assert.ok(md.includes("▶ 60  line 60"));
    assert.ok(md.includes("   57  line 57") || md.includes("  57  line 57"));
    assert.ok(!md.includes("line 56\n"));
    assert.ok(md.endsWith("*Lines 57–96 of this stretch (lines 1–100).*"));
  });

  test("a passage: matched words in bold, a quote card, the part it is", () => {
    const doc = row(
      { path: "/d/n.md", kind: "doc", segment: "chunk", loc: 2, excerpt: "the «invoice»", info: { chunks: "5" } },
      ["invoice"],
    );
    assert.equal(
      passageMarkdown(doc, "Pay the invoice now.\nThanks"),
      "> Pay the **invoice** now.\n> Thanks\n\n*Part 2 of 5*",
    );
  });

  test("previewMarkdown while loading, and when there's nothing to show", () => {
    const image = row({ path: "/a.png", kind: "image" });
    assert.equal(previewMarkdown(image, {}), "*Loading the preview…*");
    assert.equal(previewMarkdown(image, { thumb: null }), "*‎*".replace("‎", "a.png"));
    const code = row({ path: "/r/a.py", kind: "code", segment: "lines", loc: 1 });
    assert.equal(previewMarkdown(code, {}), "*Reading the code…*");
  });
});

describe("editors (DigUp CodeEditors.swift)", () => {
  test("the preference picks the editor; auto is the first installed one", () => {
    const installed = new Set(["com.microsoft.VSCode", "dev.zed.Zed"]);
    assert.equal(chooseEditor("auto", installed)?.name, "Zed");
    assert.equal(chooseEditor(undefined, installed)?.name, "Zed");
    assert.equal(chooseEditor("com.microsoft.VSCode", installed)?.name, "Visual Studio Code");
    assert.equal(chooseEditor("com.sublimetext.4", installed)?.name, "Zed");
    assert.equal(chooseEditor("default", installed), null);
    assert.equal(chooseEditor("auto", new Set()), null);
    assert.equal(CODE_EDITORS.length, 23);
  });

  test("how each editor is told the line", () => {
    const by = (id: string) => CODE_EDITORS.find((e) => e.id === id)!;
    assert.deepEqual(launchPlan(by("com.microsoft.VSCode"), "/A/Code.app", "/p/a b.py", 12), {
      type: "url",
      url: "vscode://file/p/a%20b.py:12:1",
    });
    assert.deepEqual(launchPlan(by("dev.zed.Zed"), "/A/Zed.app", "/p/a.py", 12), {
      type: "exec",
      file: "/A/Zed.app/Contents/MacOS/cli",
      args: ["/p/a.py:12"],
    });
    assert.deepEqual(launchPlan(by("com.apple.dt.Xcode"), "/A/Xcode.app", "/p/a.swift", 3), {
      type: "exec",
      file: "/A/Xcode.app/Contents/Developer/usr/bin/xed",
      args: ["--line", "3", "/p/a.swift"],
    });
    assert.deepEqual(launchPlan(by("com.jetbrains.pycharm"), "/A/PyCharm.app", "/p/a.py", 7, "pycharm"), {
      type: "exec",
      file: "/A/PyCharm.app/Contents/MacOS/pycharm",
      args: ["--line", "7", "/p/a.py"],
    });
    assert.deepEqual(launchPlan(by("com.macromates.TextMate"), "/A/TextMate.app", "/p/a.py", 2), {
      type: "url",
      url: "txmt://open?url=file%3A%2F%2F%2Fp%2Fa.py&line=2",
    });
  });
});

describe("folders (DigUp FolderSelection, AppController.applyFolders)", () => {
  const same = { resolve: (p: string) => p, home: HOME };

  test("adding: a new folder, one searched already, one inside a chosen folder", () => {
    const start = { chosen: [`${HOME}/Documents`], skipped: [] };
    assert.deepEqual(addFolders(start, ["~/Desktop"], same), {
      chosen: [`${HOME}/Documents`, `${HOME}/Desktop`],
      skipped: [],
      notes: [],
    });
    assert.deepEqual(addFolders(start, [`${HOME}/Documents/Docs/`], same).notes, [
      "“Docs” is searched already, as part of “Documents”.",
    ]);
    assert.deepEqual(addFolders(start, [`${HOME}/Documents`], same).notes, ["“Documents” is searched already."]);
  });

  test("a parent replaces the folders it covers; a skip goes with its folder", () => {
    const start = { chosen: [`${HOME}/Documents/A`], skipped: [] };
    assert.deepEqual(addFolders(start, [`${HOME}/Documents`], same).chosen, [`${HOME}/Documents`]);
    const skipped = skipFolders({ chosen: [`${HOME}/Documents`], skipped: [] }, [`${HOME}/Documents/Old`], same);
    assert.deepEqual(skipped, { chosen: [`${HOME}/Documents`], skipped: [`${HOME}/Documents/Old`], notes: [] });
    assert.deepEqual(removeFolder(skipped, `${HOME}/Documents`), { chosen: [], skipped: [], notes: [] });
    assert.deepEqual(unskipFolder(skipped, `${HOME}/Documents/Old`).skipped, []);
    assert.deepEqual(skipFolders(skipped, ["/elsewhere/X"], same).notes, ["“X” isn't searched anyway."]);
  });

  test("the add summary (DigUp AddFolders.swift): nothing picked, looking, what it adds", () => {
    const estimate = (seconds: number, laterSeconds = 0, bytes?: number) => ({
      folder: "/x",
      files: 10,
      byKind: {},
      skipped: {},
      seconds,
      laterSeconds,
      bytes,
    });
    assert.equal(addSummary([], false), "Choose the folders to add");
    assert.equal(addSummary([estimate(8), undefined], false), "Looking at the folders…");
    assert.equal(addSummary([estimate(5), estimate(3)], false), "Adds about 8 s of indexing");
    assert.equal(addSummary([estimate(0.2)], false), "Adds under a second of indexing");
    assert.equal(
      addSummary([estimate(300, 100), estimate(60, 20), "failed"], false),
      "Adds about 6 min of indexing, and 2 min more for long files",
    );
    assert.equal(addSummary([estimate(60, 29)], false), "Adds about 60 s of indexing");
    assert.equal(addSummary([estimate(40, 0, 30_000_000)], true), "Adds about 40 s of indexing and 30 MB");
    assert.equal(addSummary(["failed"], false), "Couldn't look inside them; they can still be searched.");
  });

  test("skipped types: “heic, .txt *.md” as DigUp's IndexOptions.extensions reads it", () => {
    assert.deepEqual(parseExtensions("HEIC, .txt *.md"), ["heic", "md", "txt"]);
    assert.deepEqual(parseExtensions("  "), []);
    assert.equal(extensionsText(["heic", "md"]), "heic, md");
  });
});

function status(over: Partial<Status> = {}): Status {
  const counts = { files: 0, done: 0, partial: 0, pending: 0, skipped: 0, failed: 0 };
  return {
    apiVersion: 1,
    pid: 1,
    setup: { state: "ready" },
    activity: { state: "idle" },
    held: null,
    main: { byKind: {}, total: { ...counts }, vectors: 0, segments: 0, unfinished: { files: 0, units: 0 } },
    code: null,
    encoder: "ready",
    lastError: null,
    folders: [`${HOME}/Desktop`],
    codeFolders: [],
    ...over,
  };
}

describe("status lines (DigUp AppModel.statusLine)", () => {
  const counts = (files: number, done: number, pending = 0) => ({
    files,
    done,
    partial: 0,
    pending,
    skipped: 0,
    failed: 0,
  });

  test("no folders, indexing, reading the rest", () => {
    assert.equal(statusLine(status({ folders: [] })), "No folders chosen yet");
    const indexing = status({
      activity: {
        state: "indexing",
        index: "main",
        pass: "first",
        done: 1234,
        total: 5000,
        current: null,
        secondsLeft: 120,
      },
    });
    assert.equal(statusLine(indexing), "Indexing 24% · 1,234 of 5,000");
    assert.equal(menuBarTitle(indexing), "24%");
    const rest = status({
      activity: {
        state: "indexing",
        index: "main",
        pass: "rest",
        done: 4,
        total: 10,
        current: null,
        secondsLeft: null,
      },
      main: { ...status().main, unfinished: { files: 3, units: 40 } },
    });
    assert.equal(statusLine(rest), "Reading the rest of 3 long files · 40%");
    assert.equal(menuBarTitle(status()), undefined);
  });

  test("idle: waiting, held, paused, indexed", () => {
    const waiting = (held: Status["held"]) => status({ held, main: { ...status().main, total: counts(10, 8, 2) } });
    assert.equal(statusLine(waiting(null)), "2 files waiting to be indexed");
    assert.equal(statusLine(waiting("paused")), "Paused · 2 files waiting");
    assert.equal(statusLine(waiting("on battery")), "2 files waiting · on battery");
    const done = status({ main: { ...status().main, total: counts(1204, 1204) } });
    assert.equal(statusLine(done), "1,204 files indexed");
    assert.equal(statusLine({ ...done, held: "paused" }), "1,204 files indexed · paused");
    assert.equal(resultsCaveat(waiting(null)), "2 files aren't indexed yet");
  });

  test("idle: code waits on its own; code search alone has its own line", () => {
    const code = (pending: number) => ({ ...status().main, total: counts(80, 80 - pending, pending) });
    // DigUp's `pending` is the main index's: code waiting for its quiet period isn't "files waiting".
    const both = status({ codeFolders: ["/r"], main: { ...status().main, total: counts(10, 10) }, code: code(5) });
    assert.equal(statusLine(both), "10 files indexed");
    const alone = (pending: number, held: Status["held"] = null) =>
      status({ folders: [], codeFolders: ["/r"], code: code(pending), held });
    assert.equal(statusLine(alone(0)), "80 code files indexed");
    assert.equal(statusLine(alone(5)), "5 code files waiting to be indexed");
    assert.equal(statusLine(alone(1, "paused")), "Paused · 1 code file waiting");
    assert.equal(statusLine(alone(0, "paused")), "80 code files indexed · paused");
  });

  test("starting, and the engine's own problems (not a file's)", () => {
    assert.equal(startingLine(null), "Starting…");
    assert.equal(startingLine(new Error("no socket")), "⚠︎ Dig Up's engine isn't running");
    // DigUp's EngineStatus.Activity: the engine opens its index, or stopped and tries again by itself.
    assert.equal(statusLine(status({ activity: { state: "starting" } })), "Starting…");
    const stopped = status({
      activity: { state: "failed", problem: "Indexing stopped" },
      lastError: { at: 1, message: "Indexing stopped: disk I/O error" },
    });
    assert.equal(statusLine(stopped), "⚠︎ Indexing stopped");
    // A last error while the engine works (a file's, or one a later pass got past) stays off the status line.
    const passing = status({ lastError: { at: 1, message: "Couldn't look through the folders: EIO" } });
    assert.equal(statusLine(passing), "0 files indexed");
    const oneFile = status({ lastError: { at: 1, message: "Couldn't read it", path: "/d/a.pdf" } });
    assert.equal(statusLine(oneFile), "0 files indexed");
    const indexing = status({
      lastError: { at: 1, message: "Indexing stopped" },
      activity: { state: "indexing", index: "main", pass: "new", done: 1, total: 4, current: null, secondsLeft: null },
    });
    assert.equal(statusLine(indexing), "Indexing 25% · 1 of 4");
  });

  test("outside the index hours: when indexing starts again (DigUp's heldUntil)", () => {
    const oneAm = new Date(2026, 9, 2, 1, 0, 0).getTime();
    const hours = (pending: number, over: Partial<Status> = {}) =>
      status({
        held: "outside index hours",
        heldUntil: oneAm,
        main: { ...status().main, total: counts(1204 + pending, 1204, pending) },
        ...over,
      });
    assert.equal(statusLine(hours(12)), "12 files waiting · indexing from 1:00 AM");
    assert.equal(statusLine(hours(0)), "1,204 files indexed · indexing from 1:00 AM");
    // Before the long files, as in DigUp.
    const long = hours(0, { main: { ...hours(0).main, unfinished: { files: 3, units: 40 } } });
    assert.equal(statusLine(long), "1,204 files indexed · indexing from 1:00 AM");
    // No time from the daemon: the reason alone. A pause wins over the hours.
    assert.equal(statusLine(hours(12, { heldUntil: null })), "12 files waiting · outside index hours");
    assert.equal(statusLine(hours(0, { heldUntil: undefined })), "1,204 files indexed · outside index hours");
    assert.equal(statusLine(hours(12, { held: "paused" })), "Paused · 12 files waiting");
    assert.equal(hoursText(hours(12, { held: "paused" })), null);
    assert.equal(hoursText(hours(0)), "indexing from 1:00 AM");
    const code = status({
      folders: [],
      codeFolders: ["/r"],
      held: "outside index hours",
      heldUntil: new Date(2026, 9, 2, 22, 30, 0).getTime(),
      code: { ...status().main, total: counts(80, 71, 9) },
    });
    assert.equal(statusLine(code), "9 code files waiting · indexing from 10:30 PM");
  });

  test("the model download", () => {
    const downloading = { state: "downloading" as const, what: "embeddinggemma-2-Q8_0.gguf", bytes: 42, total: 100 };
    assert.equal(statusLine(status({ setup: downloading })), "Downloading the model · 42%");
    assert.equal(
      setupLine({ state: "downloading", what: "llama-b11624-bin-macos-arm64", bytes: 1, total: 2 }),
      "Downloading llama.cpp · 50%",
    );
    assert.equal(downloadName("mmproj-embeddinggemma-2-Q8_0.gguf"), "the model");
    assert.equal(setupLine({ state: "failed", error: "Hugging Face answered 503" }), "Setup download stopped");
    assert.equal(setupProgressText(downloading, 70), "42% · about 70 s left");
    assert.equal(setupProgressText(downloading, 180), "42% · about 3 min left");
    assert.equal(setupProgressText(downloading, 20), "42% · less than a minute left");
    assert.equal(
      statusDetail(status({ setup: downloading }), (p) => p),
      "42%",
    );
    assert.equal(downloadRate({ bytes: 0, at: 0 }, { bytes: 500, at: 1000 }), 500);
    assert.equal(downloadRate(null, { bytes: 500, at: 1000 }), null);
  });

  test("the download's rate from the daemon, and waiting for the network", () => {
    const downloading = { state: "downloading" as const, what: "embeddinggemma-2-Q8_0.gguf", bytes: 42, total: 100 };
    // The daemon's measure wins; the client's is the fallback; neither means no time to tell.
    assert.equal(downloadSecondsLeft({ ...downloading, bytesPerSecond: 2 }, 58), 29);
    assert.equal(downloadSecondsLeft(downloading, 1), 58);
    assert.equal(downloadSecondsLeft(downloading), null);
    assert.equal(
      statusDetail(status({ setup: { ...downloading, bytesPerSecond: 1 } }), (p) => p),
      "42% · about 58 s left",
    );
    const waiting = { ...downloading, waiting: "Waiting for the network…" };
    assert.equal(downloadSecondsLeft({ ...waiting, bytesPerSecond: 2 }), null);
    assert.equal(setupProgressText(waiting, 30), "Waiting for the network…");
    assert.equal(setupLine(waiting), "Model download: waiting for the network");
    assert.equal(statusLine(status({ setup: waiting })), "Model download: waiting for the network");
    assert.equal(
      statusDetail(status({ setup: waiting }), (p) => p),
      "Waiting for the network…",
    );
    assert.equal(
      setupLine({ state: "downloading", what: "llama-b11624-bin-macos-arm64", bytes: 1, total: 2, waiting: "x" }),
      "llama.cpp download: waiting for the network",
    );
  });

  test("how often the views ask: not while the engine waits to try again", () => {
    assert.equal(isBusy(status()), false);
    assert.equal(isBusy(status({ activity: { state: "starting" } })), true);
    assert.equal(isBusy(status({ activity: { state: "syncing", index: "main" } })), true);
    assert.equal(isBusy(status({ activity: { state: "failed", problem: "Can't open the index" } })), false);
    assert.equal(isBusy(status({ setup: { state: "verifying", what: "x.gguf" } })), true);
    assert.equal(isBusy(status({ setup: { state: "downloading", what: "x.gguf", bytes: 1, total: 2 } })), true);
    // Just after POST /setup, until the download shows.
    const missing = status({ setup: { state: "missing", missing: ["model-text"] } });
    assert.equal(isBusy(missing), false);
    assert.equal(isBusy(missing, true), true);
    assert.equal(isBusy(status(), true), false);
  });

  test("details, folder lists, kind counts", () => {
    const names = (p: string) => p.slice(p.lastIndexOf("/") + 1);
    assert.equal(statusDetail(status({ codeFolders: ["/r/code"] }), names), "In Desktop; code in code");
    const marked = status({
      folders: ["/u/Desktop", "/Volumes/T7/Documents", "/u/Pictures"],
      missingFolders: ["/Volumes/T7/Documents"],
      unreadableFolders: ["/u/Pictures"],
      codeFolders: ["/Volumes/T7/repos"],
      codeMissingFolders: ["/Volumes/T7/repos"],
      codeUnreadableFolders: [],
    });
    assert.equal(
      statusDetail(marked, names),
      "In Desktop, Documents (not connected), Pictures (no access); code in repos (not connected)",
    );
    assert.equal(statusDetail(status({ folders: [] }), names), "Pick the folders it should search.");
    assert.equal(foldersText(["Desktop", "Documents", "Downloads"]), "Desktop, Documents and Downloads");
    assert.equal(foldersText(["Desktop"]), "Desktop");
    assert.equal(foldersText(["a", "b", "c", "d", "e"]), "5 folders");
    assert.equal(kindCountsText({ screenshot: 136, image: 104, pdf: 25 }), "136 screenshots, 104 images, 25 PDFs");
    assert.equal(
      indexSummary({ ...status().main, total: counts(365, 357, 8), unfinished: { files: 2, units: 9 } }),
      "357 of 365 files searchable · 8 waiting · 2 long files to finish",
    );
  });
});

describe("copy (DigUp's strings, saying Dig Up)", () => {
  test("placeholders, empty states, folds", () => {
    assert.equal(placeholder(false), "Describe it: “payment error screenshot”, “zebra in a video”…");
    assert.equal(placeholder(true), "Describe it: “zebra in a video”, “code: retry with backoff”…");
    assert.equal(
      placeholder(false, "all", true),
      "Describe it: “receipt from the hardware store”, “zebra in a video”…",
    );
    assert.equal(placeholder(true, "code"), "Describe the code: “retry a request with backoff”, a name in it…");
    assert.equal(noMatches(false).title, "No good matches");
    assert.equal(noMatches(true).title, "No good matches in your code");
    assert.equal(noMatches(false, true, " zebra ").title, "No good matches for “zebra”");
    assert.equal(weakerTitle(1, false), "1 weaker match");
    assert.equal(weakerTitle(14, false), "14 weaker matches");
    assert.equal(weakerTitle(14, true), "Weaker matches");
    assert.equal(showAllTitle("documents", 8), "Show all 8 documents…");
    assert.equal(showAllTitle("video", 7), "Show all 7 video…");
    assert.equal(CODE_EXAMPLES.length, 3);
    assert.equal(homeExamples(true).at(-1)?.text, "code: where the settings are saved");
    assert.equal(homeExamples(false).length, 6);
    assert.equal(isKindFilter("documents"), true);
    assert.equal(isKindFilter("pdf"), false);
  });

  test("setup names what will be downloaded", () => {
    assert.equal(
      setupSubtitle({ state: "missing", missing: ["model-text", "model-media", "llama"] }),
      "Downloads the model (865 MB) and llama.cpp, once",
    );
    assert.equal(setupSubtitle({ state: "missing", missing: ["llama"] }), "Downloads llama.cpp's server, once");
    // The menu-bar command runs only once it's been opened (PARITY P-146).
    assert.ok(welcomeMarkdown({ state: "ready" }).includes(MENU_BAR_HINT));
    assert.ok(MENU_BAR_HINT.includes("Dig Up Status"));
  });
});

describe("daemon files (the menu bar's no-start check)", () => {
  test("no settings file means no folders; a broken one means unknown", () => {
    const dir = mkdtempSync(join(tmpdir(), "digup-files-"));
    try {
      assert.equal(foldersChosen(dir), "no");
      assert.equal(daemonRunning(dir, join(dir, "daemon.js")), false);
      writeFileSync(join(dir, CONFIG_FILE), JSON.stringify({ folders: [], codeFolders: [] }));
      assert.equal(foldersChosen(dir), "no");
      writeFileSync(join(dir, CONFIG_FILE), JSON.stringify({ folders: ["/x"], codeFolders: [] }));
      assert.equal(foldersChosen(dir), "yes");
      writeFileSync(join(dir, CONFIG_FILE), "{not json");
      assert.equal(foldersChosen(dir), "unknown");
      // A live process that isn't the daemon (a pid daemon.json outlived), and one that's gone.
      writeFileSync(
        join(dir, "daemon.json"),
        JSON.stringify({ pid: process.pid, socket: "/x", apiVersion: 1, startedAt: Date.now() }),
      );
      assert.equal(daemonRunning(dir, "/Applications/x/assets/daemon.js"), false);
      writeFileSync(
        join(dir, "daemon.json"),
        JSON.stringify({ pid: 2 ** 22 + 7, socket: "/x", apiVersion: 1, startedAt: 0 }),
      );
      assert.equal(daemonRunning(dir, "/Applications/x/assets/daemon.js"), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a daemon is known by its title or its daemon.js, and by when it started", async () => {
    const dir = mkdtempSync(join(tmpdir(), "digup-files-"));
    const script = join(dir, "daemon.js");
    writeFileSync(script, "setInterval(() => {}, 60_000);");
    // The title comes from the environment, so only the title (not the command line) can name it.
    const named = spawn(process.execPath, ["-e", "process.title = process.env.TITLE; setInterval(() => {}, 60_000);"], {
      env: { ...process.env, TITLE: "dig-up-daemon" },
    });
    const plain = spawn(process.execPath, [script, "--support", dir]);
    const startedAt = Date.now();
    try {
      const info = (pid: number | undefined, at = startedAt) => ({
        pid: pid as number,
        socket: "/x",
        apiVersion: 1,
        startedAt: at,
      });
      // The title shows once the child has set it.
      for (let i = 0; i < 50 && !isOurDaemon(info(named.pid), script); i++)
        await new Promise((r) => setTimeout(r, 100));
      assert.equal(isOurDaemon(info(named.pid), "/elsewhere/daemon.js"), true);
      assert.equal(isOurDaemon(info(plain.pid), script), true);
      assert.equal(isOurDaemon(info(plain.pid), "/elsewhere/daemon.js"), false);
      // The same pid, started at another time: a program that got a dead daemon's pid.
      assert.equal(isOurDaemon(info(plain.pid, startedAt - 3_600_000), script), false);
      writeFileSync(join(dir, "daemon.json"), JSON.stringify(info(plain.pid)));
      assert.equal(daemonRunning(dir, script), true);
    } finally {
      named.kill();
      plain.kill();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("folder rows (DigUp SettingsWindow FolderStatusRow)", () => {
  const summary = (over: Partial<FolderSummary> = {}): FolderSummary => ({
    folder: "/u/Desktop",
    missing: false,
    unreadable: false,
    files: 1300,
    indexed: 1204,
    pending: 8,
    failed: 3,
    skipped: 5,
    unfinished: 2,
    byKind: { screenshot: 136, image: 104, pdf: 25 },
    ...over,
  });

  test("what the index holds of a folder, and what waits", () => {
    assert.equal(folderIndexedText(summary()), "1,204 of 1,300 indexed");
    assert.equal(folderStatesText(summary()), "8 waiting · 2 long files to finish · 5 skipped · 3 couldn't be read");
    assert.equal(
      folderStatesText(summary({ pending: 0, failed: 0, skipped: 0, unfinished: 1 })),
      "1 long file to finish",
    );
    assert.equal(folderStatesText(summary({ pending: 0, failed: 0, skipped: 0, unfinished: 0 })), "");
    assert.equal(folderIndexedText(summary({ missing: true })), "Kept for when it's back");
    assert.equal(folderIndexedText(summary(), "unreadable"), "Kept for when it's back");
    const lists = status({ folderSummaries: [summary()], codeFolderSummaries: [summary({ folder: "/r" })] });
    assert.equal(summaryOf(lists, "/u/Desktop", false)?.files, 1300);
    assert.equal(summaryOf(lists, "/u/Desktop", true), undefined);
    assert.equal(summaryOf(lists, "/r", true)?.folder, "/r");
    assert.equal(summaryOf(null, "/r", true), undefined);
  });

  test("an unplugged drive is Not connected; only a refusal is No access", () => {
    const gone = { readable: false, error: "it isn't there" };
    const refused = {
      readable: false,
      error: "macOS doesn't let Dig Up read it: give Raycast Full Disk Access, or access to this folder",
    };
    assert.equal(accessTrouble(gone), "missing");
    assert.equal(accessTrouble({ readable: false, error: "it isn't a folder" }), "missing");
    assert.equal(accessTrouble(refused), "unreadable");
    assert.equal(accessTrouble({ readable: true }), null);
    assert.equal(accessTrouble(undefined), null);
    assert.equal(troubleTag("missing"), "Not connected");
    assert.equal(troubleTag("unreadable"), "No access");
    // Without a status, the /access reply decides.
    assert.equal(folderTrouble("/v/a", false, null, gone), "missing");
    assert.equal(folderTrouble("/v/a", false, null, refused), "unreadable");
    // The status's lists: for the folders, or the code folders.
    const lists = status({
      missingFolders: ["/v/a"],
      unreadableFolders: ["/u/b"],
      codeMissingFolders: [],
      codeUnreadableFolders: ["/v/a"],
    });
    assert.equal(folderTrouble("/v/a", false, lists), "missing");
    assert.equal(folderTrouble("/u/b", false, lists), "unreadable");
    assert.equal(folderTrouble("/v/a", true, lists), "unreadable");
    // A drive plugged back in since /access answered: the polled status says so.
    assert.equal(folderTrouble("/v/c", false, lists, gone), null);
    // macOS refuses now, before a pass has told the daemon.
    assert.equal(folderTrouble("/v/c", false, lists, refused), "unreadable");
  });
});

describe("daemon identity from ps etime", () => {
  test("elapsedSeconds reads every etime form and refuses others", () => {
    assert.equal(elapsedSeconds("05:02"), 302);
    assert.equal(elapsedSeconds("01:05:02"), 3902);
    assert.equal(elapsedSeconds("3-01:05:02"), 3 * 86400 + 3902);
    assert.equal(elapsedSeconds("jeu. 15 oct."), null);
  });
});

test("setup identifies missing engine separately from cached model", () => {
  const missing = { state: "missing" as const, missing: ["llama" as const] };
  assert.equal(setupLine(missing), "Search engine needs to be downloaded");
  assert.equal(statusLine(status({ setup: missing })), "Search engine needs to be downloaded");
  assert.match(setupLine({ state: "missing", missing: ["model-media"] })!, /Search model/);
  assert.match(setupLine({ state: "missing", missing: ["model-text", "llama"] })!, /Model and search engine/);
  assert.equal(
    setupLine({ state: "downloading", what: "llama.cpp", bytes: 0, total: 0 }),
    "Preparing llama.cpp download…",
  );
});

test("first-pass progress counts the whole library after a sync restarts the batch", () => {
  const base = status();
  const indexed = status({
    ...base,
    main: { ...base.main, total: { files: 100, done: 70, partial: 0, pending: 20, skipped: 9, failed: 1 } },
    activity: { state: "indexing", index: "main", pass: "first", done: 1, total: 20, current: null, secondsLeft: 10 },
  });
  assert.equal(statusLine(indexed), "Indexing 80% · 70 searchable");
  assert.equal(menuBarTitle(indexed), "80%");
  assert.match(resultsCaveat(indexed)!, /80%/);
});
