import { test, expect } from "bun:test";
import { parseInputToolsResponse, segmentInput, isTransliterableSegment } from "./google";

test("parses ranked candidates from a SUCCESS response", () => {
  const raw = ["SUCCESS", [["nepal", ["नेपाल", "नेपल", "नपाल"], [], { candidate_type: [0, 0, 0] }]]];
  expect(parseInputToolsResponse(raw)).toEqual(["नेपाल", "नेपल", "नपाल"]);
});

test("multi-word returns the single combined candidate", () => {
  const raw = ["SUCCESS", [["ma ghar janchhu", ["मा घर जान्छु"], [], { candidate_type: [0] }]]];
  expect(parseInputToolsResponse(raw)).toEqual(["मा घर जान्छु"]);
});

test("throws on non-SUCCESS status", () => {
  expect(() => parseInputToolsResponse(["ERROR", []])).toThrow();
});

test("throws on empty candidate list", () => {
  expect(() => parseInputToolsResponse(["SUCCESS", [["x", [], [], { candidate_type: [] }]]])).toThrow();
});

test("throws on malformed shape", () => {
  expect(() => parseInputToolsResponse({ nope: true })).toThrow();
});

test("segmentInput keeps comma delimiters as separate parts", () => {
  expect(segmentInput("namaste, sanjay")).toEqual(["namaste", ",", " sanjay"]);
});

test("segmentInput keeps spaces inside a segment and splits on newline", () => {
  expect(segmentInput("ma ghar\ngharma")).toEqual(["ma ghar", "\n", "gharma"]);
});

test("segmentInput on plain text is a single segment", () => {
  expect(segmentInput("nepal")).toEqual(["nepal"]);
});

test("isTransliterableSegment: text yes, delimiters and blanks no", () => {
  expect(isTransliterableSegment(" sanjay")).toBe(true);
  expect(isTransliterableSegment(",")).toBe(false);
  expect(isTransliterableSegment("\n")).toBe(false);
  expect(isTransliterableSegment("   ")).toBe(false);
});
