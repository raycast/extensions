import { describe, expect, it } from "vitest";
import { aggregate, readBlock, statusOf, step, type ProcessInfo, type Stored } from "./block-state";

const login = { pid: 1, name: "login" };
const zsh = { pid: 2, name: "zsh", argv0: "zsh" };
// Shapes copied from real `rex block call process` / `program_status` output.
const idleShell: ProcessInfo = { last_exit: null, child: login, foreground: zsh };
const claudeRunning: ProcessInfo = {
  last_exit: null,
  child: login,
  foreground: { pid: 9, name: "2.1.318", argv0: "claude" },
};
const stored = (state: Stored["state"], extra: Partial<Stored> = {}): Stored => ({ state, unseen: false, ...extra });

describe("readBlock", () => {
  it("a shell waiting at its prompt is idle", () => {
    expect(readBlock(idleShell)).toEqual({ state: "idle" });
  });
  it("a program under the shell is working, named by argv0", () => {
    expect(readBlock(claudeRunning)).toEqual({ state: "working", detail: "claude" });
  });
  it("a pane whose own program is alive is working even if that program is a shell", () => {
    const p: ProcessInfo = { last_exit: null, child: { pid: 5, name: "sh" }, foreground: { pid: 5, name: "sh" } };
    expect(readBlock(p).state).toBe("working");
  });
  it("a program that exited is done, or error on a non-zero code", () => {
    expect(readBlock({ last_exit: { exit_code: 0 } }).state).toBe("done");
    expect(readBlock({ last_exit: { exit_code: 2 } })).toEqual({ state: "error", detail: "exit 2" });
  });
  it("reported status wins over the process, and blocked beats working", () => {
    const r = readBlock(claudeRunning, [
      { state: "working", app: "claude-code", updated_at: "t1" },
      { state: "blocked", kind: "permission", msg: "Run npm test?", updated_at: "t2" },
    ]);
    expect(r).toEqual({ state: "blocked", kind: "permission", detail: "Run npm test?", updatedAt: "t2" });
  });
  it("unknown states count as idle and fall back to the process", () => {
    expect(readBlock(claudeRunning, [{ state: "sleeping" }]).state).toBe("working");
    expect(readBlock(idleShell, [{ state: "idle" }]).state).toBe("idle");
  });
  it("a program that reports idle is idle even while it stays in the foreground", () => {
    // Real case: Claude Code waiting at its prompt after a refused permission.
    expect(readBlock(claudeRunning, [{ state: "idle", app: "claude-code", updated_at: "t" }]).state).toBe("idle");
  });
  it("a program reporting done (like Claude Code) reads as done", () => {
    expect(readBlock(claudeRunning, [{ state: "done", app: "claude-code", updated_at: "t" }])).toMatchObject({
      state: "done",
      detail: "claude-code",
    });
  });
});

describe("step", () => {
  it("the first reading never notifies, even if it says done", () => {
    const { stored: s, event } = step(undefined, { state: "done", updatedAt: "t" });
    expect(event).toBeUndefined();
    expect(statusOf(s)).toBe("idle");
  });
  it("working → idle is finished, and stays unseen until opened", () => {
    const first = step(stored("working"), { state: "idle" });
    expect(first.event).toBe("finished");
    expect(statusOf(first.stored)).toBe("finished");
    const second = step(first.stored, { state: "idle" });
    expect(second.event).toBeUndefined();
    expect(statusOf(second.stored)).toBe("finished");
  });
  it("working → blocked asks for input once, and again for a new prompt", () => {
    const a = step(stored("working"), { state: "blocked", kind: "question", updatedAt: "1" });
    expect(a.event).toBe("blocked");
    expect(statusOf(a.stored)).toBe("blocked");
    expect(step(a.stored, { state: "blocked", updatedAt: "1" }).event).toBeUndefined();
    expect(step(a.stored, { state: "blocked", updatedAt: "2" }).event).toBe("blocked");
  });
  it("blocked → working (the user answered) is quiet and clears the mark", () => {
    const r = step(stored("blocked"), { state: "working", updatedAt: "3" });
    expect(r.event).toBeUndefined();
    expect(statusOf(r.stored)).toBe("working");
  });
  it("catches a run that started and finished between two polls", () => {
    expect(step(stored("done", { updatedAt: "1" }), { state: "done", updatedAt: "2" }).event).toBe("finished");
    expect(step(stored("done", { updatedAt: "1" }), { state: "done", updatedAt: "1" }).event).toBeUndefined();
    expect(step(stored("idle"), { state: "done", updatedAt: "2" }).event).toBe("finished");
  });
  it("an error is reported as failed", () => {
    const r = step(stored("working"), { state: "error", updatedAt: "9" });
    expect(r.event).toBe("failed");
    expect(statusOf(r.stored)).toBe("failed");
  });
  it("a seen failure goes back to idle", () => {
    expect(statusOf({ state: "error", unseen: false })).toBe("idle");
  });
});

describe("aggregate", () => {
  it("picks the most urgent status", () => {
    expect(aggregate(["idle", "finished", "working"])).toBe("working");
    expect(aggregate(["working", "blocked", "failed"])).toBe("blocked");
    expect(aggregate([])).toBe("idle");
  });
});
