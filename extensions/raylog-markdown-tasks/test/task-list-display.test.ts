import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskListDisplayText } from "../src/lib/task-list-display";

test("task list display text omits empty body subtitles", () => {
  assert.deepEqual(buildTaskListDisplayText("Task", "   "), {
    title: "Task",
  });
});

test("task list display text gives short headers more body room", () => {
  const body = "A".repeat(120);

  const shortHeader = buildTaskListDisplayText("Short task", body, 1);
  const longHeader = buildTaskListDisplayText("Long task ".repeat(8), body, 1);

  assert.equal(shortHeader.subtitle?.length, 70);
  assert.equal(longHeader.title.length, 54);
  assert.equal(longHeader.subtitle?.length, 26);
});

test("task list display text uses the same body budget for any indicators", () => {
  const body = "A".repeat(120);

  const oneIndicator = buildTaskListDisplayText("Task", body, 1);
  const twoIndicators = buildTaskListDisplayText("Task", body, 2);

  assert.equal(oneIndicator.subtitle, twoIndicators.subtitle);
  assert.equal(oneIndicator.subtitle?.length, 76);
});
