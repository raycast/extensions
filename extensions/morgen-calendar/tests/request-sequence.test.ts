import assert from "node:assert/strict";
import test from "node:test";
import { RequestSequence } from "../src/lib/request-sequence";

test("a slow old range cannot replace the result or loading state of a newer range", async () => {
  const sequence = new RequestSequence();
  const applied: string[] = [];
  let releaseOld!: (value: string) => void;
  const oldResponse = new Promise<string>((resolve) => { releaseOld = resolve; });
  const oldIsCurrent = sequence.begin();
  const oldLoad = oldResponse.then((value) => {
    if (oldIsCurrent()) applied.push(value, "old-finished");
  });
  const newIsCurrent = sequence.begin();
  const newValue = await Promise.resolve("30-day events");
  if (newIsCurrent()) applied.push(newValue, "new-finished");
  releaseOld("7-day events");
  await oldLoad;
  assert.deepEqual(applied, ["30-day events", "new-finished"]);
});

test("changing range or unmounting invalidates a request before another begins", () => {
  const sequence = new RequestSequence();
  const isCurrent = sequence.begin();
  sequence.invalidate();
  assert.equal(isCurrent(), false);
});
