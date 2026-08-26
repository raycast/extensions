import assert from "node:assert";
import test from "node:test";
import {
  escapeMarkdown,
  formatForOutput,
  formatTimestamp,
  formatTranscription,
  hasTimedSegments,
  outputExtension,
} from "../src/utils/format";
import { TranscriptionResult } from "../src/types";

test("formatTimestamp formats seconds correctly", () => {
  assert.strictEqual(formatTimestamp(0), "00:00");
  assert.strictEqual(formatTimestamp(65), "01:05");
  assert.strictEqual(formatTimestamp(3661), "01:01:01");
});

test("formatTimestamp returns fallback for missing input", () => {
  assert.strictEqual(formatTimestamp(undefined), "00:00:00");
});

test("escapeMarkdown escapes reserved characters", () => {
  assert.strictEqual(
    escapeMarkdown("**hello** _world_ [link](url) `code`"),
    "\\*\\*hello\\*\\* \\_world\\_ \\[link\\]\\(url\\) \\`code\\`",
  );
});

test("formatTranscription formats plain text into paragraphs", () => {
  const result: TranscriptionResult = {
    text: "First sentence. Second sentence. Third sentence. Fourth sentence.",
  };
  const formatted = formatTranscription(result, false, false);
  assert.ok(formatted.plainText.includes("."));
  assert.ok(formatted.markdown.includes("."));
  assert.strictEqual(formatted.plainText.split("\n\n").length, 2);
});

test("formatTranscription preserves existing paragraphs", () => {
  const result: TranscriptionResult = {
    text: "Paragraph one.\n\nParagraph two.\n\nParagraph three.",
  };
  const formatted = formatTranscription(result, false, false);
  assert.strictEqual(formatted.plainText.split("\n\n").length, 3);
});

test("formatTranscription labels speakers when requested", () => {
  const result: TranscriptionResult = {
    text: "Hello. Goodbye.",
    segments: [
      { speaker: "Speaker 1", start: 0, end: 1, text: "Hello." },
      { speaker: "Speaker 2", start: 1, end: 2, text: "Goodbye." },
    ],
  };
  const formatted = formatTranscription(result, false, true);
  assert.ok(formatted.markdown.includes("**Speaker 1:**"));
  assert.ok(formatted.markdown.includes("**Speaker 2:**"));
});

test("formatForOutput throws for SRT without timestamps", () => {
  const result: TranscriptionResult = { text: "No timestamps here." };
  assert.throws(() => formatForOutput(result, "srt", false), /no timestamps/);
});

test("formatForOutput returns SRT when timestamps exist", () => {
  const result: TranscriptionResult = {
    text: "Hello.",
    segments: [{ start: 0, end: 1, text: "Hello." }],
  };
  const srt = formatForOutput(result, "srt", false);
  assert.ok(srt.includes("00:00:00,000 --> 00:00:01,000"));
});

test("hasTimedSegments detects timed segments", () => {
  assert.strictEqual(
    hasTimedSegments({ text: "", segments: [{ start: 0, end: 1, text: "x" }] }),
    true,
  );
  assert.strictEqual(hasTimedSegments({ text: "", segments: [{ text: "x" }] }), false);
  assert.strictEqual(hasTimedSegments({ text: "" }), false);
});

test("outputExtension returns correct extensions", () => {
  assert.strictEqual(outputExtension("plain"), ".txt");
  assert.strictEqual(outputExtension("srt"), ".srt");
  assert.strictEqual(outputExtension("markdown"), ".md");
});
