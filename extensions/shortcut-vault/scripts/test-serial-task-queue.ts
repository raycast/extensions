import assert from "node:assert/strict";
import { createSerialTaskQueue } from "../src/lib/serial-task-queue";

async function run() {
  const queue = createSerialTaskQueue();
  const events: string[] = [];
  let releaseFirstTask: (() => void) | undefined;
  const firstTaskFinished = new Promise<void>((resolve) => {
    releaseFirstTask = resolve;
  });

  const first = queue.run(async () => {
    events.push("first:start");
    await firstTaskFinished;
    events.push("first:end");
  });

  const second = queue.run(async () => {
    events.push("second:start");
    events.push("second:end");
  });

  await Promise.resolve();
  assert.deepEqual(events, ["first:start"]);

  releaseFirstTask?.();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["first:start", "first:end", "second:start", "second:end"]);

  await assert.rejects(queue.run(async () => Promise.reject(new Error("expected failure"))), /expected failure/);

  const resultAfterFailure = await queue.run(async () => "still runs");
  assert.equal(resultAfterFailure, "still runs");

  console.log("serial task queue tests passed");
}

void run();
