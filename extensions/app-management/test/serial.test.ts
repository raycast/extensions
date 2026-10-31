import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serialQueue } from "../src/lib/serial.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("serialQueue (storage write ordering)", () => {
  it("runs tasks one at a time in call order, even when an earlier task is slower", async () => {
    const enqueue = serialQueue();
    const log: string[] = [];
    const slow = enqueue(async () => {
      log.push("a start");
      await delay(20);
      log.push("a end");
    });
    const fast = enqueue(async () => {
      log.push("b start");
      log.push("b end");
    });
    await Promise.all([slow, fast]);
    assert.deepEqual(log, ["a start", "a end", "b start", "b end"]);
  });

  it("a read-modify-write per task never loses an update", async () => {
    const enqueue = serialQueue();
    let stored: string[] = [];
    const append = (value: string) =>
      enqueue(async () => {
        const current = [...stored];
        await delay(5);
        stored = [...current, value];
      });
    await Promise.all([append("switchedAt"), append("frontAt"), append("pin")]);
    assert.deepEqual(stored, ["switchedAt", "frontAt", "pin"]);
  });

  it("a failed task rejects its caller and the next task still runs", async () => {
    const enqueue = serialQueue();
    const failed = enqueue(async () => {
      throw new Error("write failed");
    });
    const next = enqueue(async () => "ran");
    await assert.rejects(failed, /write failed/);
    assert.equal(await next, "ran");
  });

  it("returns each task's own result", async () => {
    const enqueue = serialQueue();
    assert.deepEqual(await Promise.all([enqueue(async () => 1), enqueue(async () => "two")]), [1, "two"]);
  });
});
