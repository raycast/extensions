import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHit } from "../src/digup/protocol";
import {
  clock,
  codeFence,
  dateOf,
  detailMarkdown,
  escapeMarkdown,
  excerptMarkdown,
  folderOf,
  formatBytes,
  hasPassage,
  highlightMarkdown,
  kindTitle,
  metadataRows,
  passage,
  placeOf,
  reasonOf,
  sections,
} from "../src/search/presentation";
import { hit, RAW_CODE_HIT } from "./fixtures";

test("moments read as a clock", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(6.083333333333333), "0:06");
  assert.equal(clock(125.9), "2:05");
  assert.equal(clock(3725), "1:02:05");
});

test("where a match is: a page, a moment, a video's sound, lines, cells", () => {
  assert.equal(placeOf(hit({ segment: "page", loc: 3 })), "p. 3");
  assert.equal(placeOf(hit({ segment: "page_image", loc: 12 })), "p. 12");
  assert.equal(placeOf(hit({ kind: "video", segment: "frame", loc: 6.08 })), "0:06");
  assert.equal(placeOf(hit({ kind: "audio", segment: "audio", loc: 0 })), "0:00");
  assert.equal(placeOf(hit({ kind: "video", segment: "audio", loc: 25 })), "♪ 0:25");
  assert.equal(placeOf(hit({ kind: "code", segment: "lines", loc: 12, locEnd: 40 })), "L12–40");
  assert.equal(placeOf(hit({ kind: "code", segment: "lines", loc: 7, locEnd: 7 })), "L7");
  assert.equal(placeOf(hit({ kind: "code", segment: "cells", loc: 2, locEnd: 4 })), "cells 2–4");
  assert.equal(placeOf(hit({ kind: "code", segment: "cells", loc: 2 })), "cell 2");
  assert.equal(placeOf(hit({ segment: "name" })), null);
  assert.equal(placeOf(hit({ segment: "chunk", loc: 1 })), null);
});

test("why a match is here, in a few words", () => {
  assert.equal(reasonOf(hit({ segment: "name" })), "Matches its name");
  assert.equal(reasonOf(hit({ segment: "page", loc: 3, z: 1.2, keywordRank: 1 })), "Has your words");
  assert.equal(reasonOf(hit({ segment: "page", loc: 3, z: 5.2 })), "Matches the text on page 3");
  assert.equal(reasonOf(hit({ segment: "page_image", loc: 3, z: 2 })), "Matches page 3");
  assert.equal(reasonOf(hit({ kind: "image", segment: "image", z: 3 })), "Matches the picture");
  assert.equal(reasonOf(hit({ kind: "screenshot", segment: "image", z: 3 })), "Matches what's on screen");
  assert.equal(reasonOf(hit({ kind: "screenshot", segment: "ocr", z: 3 })), "Matches the text in it");
  assert.equal(reasonOf(hit({ kind: "video", segment: "frame", loc: 6, z: 3.8 })), "Matches the frame at 0:06");
  assert.equal(reasonOf(hit({ kind: "video", segment: "audio", loc: 25, z: 3 })), "Matches the sound at 0:25");
  assert.equal(reasonOf(hit({ kind: "audio", segment: "audio", loc: 0, z: 5 })), "Matches what's heard at 0:00");
  assert.equal(reasonOf(hit({ kind: "doc", segment: "chunk", z: 4 })), "Matches its text");
  assert.equal(reasonOf(hit({ kind: "code", segment: "lines", loc: 1, locEnd: 33, z: 3 })), "Matches lines 1–33");
  assert.equal(reasonOf(hit({ kind: "hologram", segment: "aura", z: 9 })), "Matches its name");
});

test("strong matches are grouped by kind, the best hit's group first; the rest are weaker matches", () => {
  const hits = [
    hit({ path: "/a.mp4", kind: "video" }),
    hit({ path: "/b.pdf", kind: "pdf" }),
    hit({ path: "/c.md", kind: "doc" }),
    hit({ path: "/d.mov", kind: "video" }),
    hit({ path: "/e.xyz", kind: "hologram" }),
    hit({ path: "/f.png", kind: "screenshot" }),
  ];
  assert.deepEqual(
    sections(hits, 5).map((section) => [section.title, section.hits.map((item) => item.path)]),
    [
      ["Video", ["/a.mp4", "/d.mov"]],
      ["Documents", ["/b.pdf", "/c.md"]],
      ["Files", ["/e.xyz"]],
      ["Weaker Matches", ["/f.png"]],
    ],
  );
  assert.deepEqual(sections([], 0), []);
  assert.deepEqual(
    sections(hits.slice(0, 1), 0).map((section) => section.title),
    ["Weaker Matches"],
  );
});

test("a file's folder is shown from home; code says where it is in its repo", () => {
  assert.equal(folderOf(hit({ path: "/Users/sam/Downloads/Screenshots/a.png" }), "/Users/sam"), "~/Downloads/Screenshots");
  assert.equal(folderOf(hit({ path: "/Users/sam/a.png" }), "/Users/sam"), "~");
  assert.equal(folderOf(hit({ path: "/Volumes/Photos/2024/a.jpg" }), "/Users/sam"), "/Volumes/Photos/2024");
  assert.equal(folderOf(hit({ path: "/Users/samal/a.jpg" }), "/Users/sam"), "/Users/samal");
  const code = parseHit(RAW_CODE_HIT);
  assert.ok(code);
  assert.equal(folderOf(code, "/Users/sam"), "billing-service/billing");
});

test("sizes count the way Finder does, and dates are short", () => {
  assert.equal(formatBytes(999), "999 bytes");
  assert.equal(formatBytes(56906), "57 KB");
  assert.equal(formatBytes(2_100_000), "2.1 MB");
  assert.equal(formatBytes(23_400_000), "23 MB");
  assert.equal(dateOf(Date.UTC(2026, 9, 7, 12) / 1000), "Oct 7, 2026");
  assert.equal(kindTitle("pdf"), "PDF");
  assert.equal(kindTitle("hologram"), "File");
});

test("text is shown as written, whatever Markdown would make of it", () => {
  assert.equal(escapeMarkdown("a*b_c [d](e) #1 <x> `y`"), "a\\*b\\_c \\[d\\]\\(e\\) \\#1 \\<x\\> \\`y\\`");
});

test("the words keyword search found are bold in an excerpt", () => {
  assert.equal(excerptMarkdown("the «pet» deposit of «300» dollars"), "the **pet** deposit of **300** dollars");
  assert.equal(excerptMarkdown("def «retry»_with_«backoff»(n):"), "def **retry**\\_with\\_**backoff**\\(n\\):");
  assert.equal(excerptMarkdown("nothing marked"), "nothing marked");
  assert.equal(excerptMarkdown("empty «» mark"), "empty  mark");
});

test("a long text is cut to a passage around the first word that matches", () => {
  const long = "a".repeat(500) + " zebra " + "b".repeat(2000);
  const cut = passage(long, ["zebra"], 400);
  assert.equal(cut.startsWith("…"), true);
  assert.equal(cut.endsWith("…"), true);
  assert.equal(cut.includes("zebra"), true);
  assert.equal(cut.length, 402);
  assert.equal(passage("  short text \n", ["zebra"]), "short text");
  assert.equal(passage("x".repeat(50), [], 20), "x".repeat(20) + "…");
});

test("the query's words are bold in a passage, in any letter case, longest first", () => {
  assert.equal(highlightMarkdown("Pets. The pet deposit.", ["pet", "pets"]), "**Pets**\\. The **pet** deposit\\.");
  assert.equal(highlightMarkdown("租约里的宠物条款", ["宠物"]), "租约里的**宠物**条款");
  assert.equal(highlightMarkdown("a (b) c", ["("]), "a \\(b\\) c");
  assert.equal(highlightMarkdown("plain", []), "plain");
});

test("code goes in a fence that its own backticks can't close, tagged with its language", () => {
  assert.equal(codeFence("def retry():\n    pass\n\n", "/a/retry.py"), "```python\ndef retry():\n    pass\n```");
  assert.equal(codeFence("x", "/a/Makefile"), "```\nx\n```");
  const fenced = codeFence("say ```` four", "/a/readme.md");
  assert.equal(fenced.startsWith("`````markdown\n"), true);
  assert.equal(fenced.endsWith("\n`````"), true);
});

test("which hits have text of their own to show", () => {
  for (const segment of ["page", "chunk", "ocr", "lines", "cells"]) assert.equal(hasPassage(hit({ segment })), true);
  for (const segment of ["image", "frame", "audio", "name", "page_image"]) assert.equal(hasPassage(hit({ segment })), false);
});

test("the detail shows the preview, then the passage; code as code; else the excerpt or the reason", () => {
  const page = hit({ path: "/Users/sam/Tax [2024]/lease.pdf", segment: "page", loc: 3, z: 5 });
  assert.equal(
    detailMarkdown({ hit: page, previewUrl: "file:///p.jpg?raycast-width=380", text: "Section 7. Pets.", words: ["pets"] }),
    "![lease\\.pdf](file:///p.jpg?raycast-width=380)\n\nSection 7\\. **Pets**\\.",
  );
  const code = hit({ kind: "code", segment: "lines", path: "/r/a.ts", excerpt: "const «a» = 1" });
  assert.equal(detailMarkdown({ hit: code, text: "const a = 1;\n", words: ["a"] }), "```typescript\nconst a = 1;\n```");
  assert.equal(detailMarkdown({ hit: code, text: null, words: [] }), "const **a** = 1");
  const photo = hit({ kind: "image", segment: "image", z: 3 });
  assert.equal(detailMarkdown({ hit: photo, words: [] }), "*Matches the picture*");
});

test("a passage keeps its line breaks, and indented lines don't turn into code", () => {
  const page = hit({ segment: "page", loc: 2, z: 5 });
  assert.equal(
    detailMarkdown({ hit: page, text: "LEASE\n    Section 7. Pets.", words: [] }),
    "LEASE  \nSection 7\\. Pets\\.",
  );
});

test("the facts beside a result", () => {
  const photo = hit({
    path: "/Users/sam/Pictures/zebra.jpg",
    kind: "image",
    segment: "image",
    z: 3,
    size: 56906,
    modified: Date.UTC(2026, 9, 7, 12) / 1000,
    info: { width: "768", height: "512" },
  });
  assert.deepEqual(metadataRows(photo, "/Users/sam"), [
    { title: "Kind", text: "Image" },
    { title: "Why", text: "Matches the picture" },
    { title: "Folder", text: "~/Pictures" },
    { title: "Modified", text: "Oct 7, 2026" },
    { title: "Dimensions", text: "768 × 512" },
    { title: "Size", text: "57 KB" },
  ]);
  const clip = hit({ kind: "video", segment: "frame", loc: 6, z: 3, size: 0, modified: 0, info: { duration: "18" } });
  assert.deepEqual(
    metadataRows(clip, "/Users/sam").map((row) => `${row.title}=${row.text}`),
    ["Kind=Video", "Where=0:06", "Why=Matches the frame at 0:06", "Folder=~/Documents", "Duration=0:18"],
  );
  const pdf = hit({ info: { pages: "463" }, loc: 3, z: 5 });
  assert.equal(metadataRows(pdf, "/Users/sam").some((row) => row.title === "Pages" && row.text === "463"), true);
});
