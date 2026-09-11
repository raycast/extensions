import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fileTypeFilters,
  fileTypeLabel,
  formatTime,
  parseSearchResponse,
  resultMarkdown,
  resultMatches,
  resultPlainText,
} from "../src/search-model";

test("Discover preserves section order, ranking, and the same file in different sections", () => {
  const row = {
    original_file: "/tmp/a.pdf",
    filename: "a.pdf",
    most_relevant_pages: [{ page: 9 }],
  };
  const sections = parseSearchResponse({
    results: {
      mode: "discover",
      sections: {
        semantic: [row],
        keyword: [],
        filename: [row],
        exact: [row, { ...row, filename: "b.pdf" }],
      },
    },
  });
  assert.deepEqual(
    sections.map((section) => section.key),
    ["exact", "filename", "keyword", "semantic"],
  );
  assert.deepEqual(
    sections[0].results.map((result) => result.filename),
    ["a.pdf", "b.pdf"],
  );
  assert.equal(sections[3].results[0].filename, "a.pdf");
});

test("file type selections combine filters and leave All unfiltered", () => {
  assert.deepEqual(fileTypeFilters([]), []);
  assert.deepEqual(fileTypeFilters(["audio", "pdf", "pdf"]), ["pdf", "audio"]);
  assert.deepEqual(fileTypeFilters(["email", "ebook", "notes"]), [
    "olk15msgsource",
    "eml",
    "emlx",
    "mbox",
    "epub",
    "notes",
  ]);
  assert.equal(fileTypeLabel([]), "All File Types");
  assert.equal(fileTypeLabel(["pdf", "audio"]), "PDF, Audio");
});

test("details preserve pages, slides, sheets, zero timestamps, transcript, and line ranges", () => {
  const result = {
    original_file: "/tmp/recording.mov",
    filename: "recording.mov",
    most_relevant_pages: [{ page: 12 }, { page: 3 }],
    most_relevant_slides: [{ slide: 4 }],
    most_relevant_sheets: [{ name: "Revenue" }],
    most_relevant_timestamps: [{ timestamp: 0 }, { timestamp: 3665 }],
    most_relevant_audio_segments: [{ start: 0, end: 12, content: "Cancellation terms" }],
    most_relevant_lines: [{ start_line: 2, end_line: 6, content: "code" }],
  };
  assert.deepEqual(
    resultMatches(result).map((match) => match.label),
    ["Page 12", "Page 3", "Slide 4", "Sheet: Revenue", "0:00", "1:01:05", "0:00 – 0:12", "Line 2–6"],
  );
  assert.match(resultPlainText(result), /Cancellation terms/);
  assert.equal(formatTime(59.9), "0:59");
});

test("indexed content cannot insert active Markdown images, links, or HTML", () => {
  const result = {
    original_file: "/tmp/a.mp3",
    filename: "a[1].mp3",
    most_relevant_audio_segments: [
      {
        start: 0,
        end: 5,
        content: "![tracking](https://example.com/image) <img src='x'>",
      },
    ],
  };
  const markdown = resultMarkdown(result);
  assert.ok(markdown.includes("\\!\\[tracking\\]\\(https://example\\.com/image\\)"));
  assert.ok(markdown.includes("&lt;img"));
  assert.ok(resultPlainText(result).includes("![tracking]"));
});

test("empty results, null match arrays, and malformed rows do not break rendering", () => {
  assert.deepEqual(parseSearchResponse({ results: [] })[0].results, []);
  assert.deepEqual(parseSearchResponse({ results: { superseded: true } }), []);
  assert.deepEqual(parseSearchResponse({ results: [null, { filename: "missing path" }] })[0].results, []);
  assert.throws(() => parseSearchResponse({ unexpected: true }), /unexpected result format/);
  assert.deepEqual(resultMatches({ filename: "a", original_file: "/a" }), []);
});
