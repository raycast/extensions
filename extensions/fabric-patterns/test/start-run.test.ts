// startRun is the one way Search and Configure Run start a run: where it goes, and when it
// is counted. @raycast/api is the preloaded stand-in (test/preload.ts).
import { beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { ReactElement } from "react";
import { fake, resetFake, tmp } from "./raycast-mock";
import { typeName } from "./render-harness";

const { startRun } = await import("../src/start-run");

beforeEach(resetFake);

function harness() {
  const events: string[] = [];
  const pushed: ReactElement[] = [];
  const push = (el: ReactElement) => (events.push("push"), pushed.push(el));
  return { events, pushed, push, onRun: () => events.push("count") };
}

const base = {
  // The test double, never a real fabric: a background start spawns whatever this names.
  fabricPath: join(import.meta.dir, "fake-fabric.sh"),
  spec: { pattern: "summarize", input: { kind: "text" as const, text: "hello" } },
  inputLabel: "Clipboard",
  output: "clipboard" as const,
  background: false,
};

describe("startRun: where a run goes and when it is counted", () => {
  test("a foreground run pushes the Result, then counts", async () => {
    const h = harness();
    await startRun(h.push, base, h.onRun);
    expect(h.events).toEqual(["push", "count"]);
    expect(typeName(h.pushed[0])).toBe("ResultView");
  });

  test("a preview is never sent to the background and is not counted", async () => {
    const h = harness();
    await startRun(h.push, { ...base, background: true, spec: { ...base.spec, dryRun: true } }, h.onRun);
    expect(h.events).toEqual(["push"]);
  });

  test("a background run that can't start is not counted and pushes nothing", async () => {
    const h = harness();
    await startRun(h.push, { ...base, background: true, outputFolder: undefined }, h.onRun);
    expect(h.events).toEqual([]);
    expect(fake.toasts[0].title).toBe("Set a Save Folder first");
  });

  test("a background run that starts is counted and pushes nothing", async () => {
    const h = harness();
    await startRun(h.push, { ...base, background: true, outputFolder: join(tmp, "saved") }, h.onRun);
    expect(h.events).toEqual(["count"]);
  });
});
