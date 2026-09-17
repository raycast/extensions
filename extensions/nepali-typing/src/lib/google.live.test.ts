import { test, expect } from "bun:test";
import { fetchCandidates, fetchTransliteration } from "./google";

test("live: nepal returns नेपाल as the top candidate", async () => {
  const candidates: string[] = await fetchCandidates("nepal");
  expect(candidates[0]).toBe("नेपाल");
}, 10000);

test("live: text after a comma is preserved", async () => {
  const result: string = await fetchTransliteration("namaste, sanjay");
  expect(result.startsWith("नमस्ते,")).toBe(true);
  expect(result.includes("सनजय")).toBe(true);
}, 10000);
