import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseLine } from "../domain/parser";
import { appendToDone, type FileSnapshot, read, watch, writeAtomic } from "./todoFile";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "txtodo-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("read", () => {
  it("returns 'notfound' when the file does not exist", async () => {
    const result = await read(join(dir, "missing.txt"));
    expect(result).toBe("notfound");
  });

  it("parses tasks from an existing file and captures mtime", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n(B) Second\n");
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0].priority).toBe("A");
    expect(result.tasks[1].priority).toBe("B");
    expect(result.mtimeMs).toBeGreaterThan(0);
    expect(result.path).toBe(path);
  });

  it("drops blank lines (todo.txt convention)", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n\n(B) Second\n\n\n");
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.tasks.length).toBe(2);
  });

  it("assigns lineNumber to each task starting at 0", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "First\nSecond\nThird\n");
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.tasks.map((t) => t.lineNumber)).toEqual([0, 1, 2]);
  });
});

describe("writeAtomic — happy path", () => {
  it("writes tasks to disk and returns a fresh snapshot", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n");
    const snap = await read(path);
    if (snap === "notfound") throw new Error("expected snapshot");

    const next = [parseLine("(A) First", 0), parseLine("(B) New task", 1)];
    const result = await writeAtomic(snap, next);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.snapshot.tasks.length).toBe(2);

    const reread = await read(path);
    if (reread === "notfound") throw new Error("expected snapshot");
    expect(reread.raw).toBe("(A) First\n(B) New task\n");
  });

  it("emits a trailing newline", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "First\n");
    const snap = await read(path);
    if (snap === "notfound") throw new Error("expected snapshot");

    await writeAtomic(snap, [parseLine("Only one", 0)]);
    const reread = await read(path);
    if (reread === "notfound") throw new Error("expected snapshot");
    expect(reread.raw).toBe("Only one\n");
  });

  it("creates the file if it doesn't exist (writing from a stub snapshot)", async () => {
    const path = join(dir, "new.txt");
    const stub: FileSnapshot = { path, mtimeMs: 0, tasks: [], raw: "" };
    const result = await writeAtomic(stub, [parseLine("Hello", 0)]);
    expect(result.kind).toBe("ok");
  });
});

describe("writeAtomic — mtime conflict", () => {
  it("returns conflict when the file changed externally between read and write", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "(A) First\n");
    const snap = await read(path);
    if (snap === "notfound") throw new Error("expected snapshot");

    await new Promise((r) => setTimeout(r, 15));
    await writeFile(path, "(A) First\n(B) External edit\n");

    const result = await writeAtomic(snap, [parseLine("(A) Stale change", 0)]);
    expect(result.kind).toBe("conflict");
    if (result.kind !== "conflict") return;
    expect(result.fresh.tasks.length).toBe(2);
  });
});

describe("watch", () => {
  it("calls onChange when the file is modified externally", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "first\n");

    let calls = 0;
    const dispose = watch(path, () => {
      calls++;
    });

    await new Promise((r) => setTimeout(r, 30));
    await writeFile(path, "second\n");
    await new Promise((r) => setTimeout(r, 250));
    dispose();

    expect(calls).toBeGreaterThanOrEqual(1);
  });

  it("debounces rapid bursts into a single onChange", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "first\n");

    let calls = 0;
    const dispose = watch(path, () => {
      calls++;
    });

    await new Promise((r) => setTimeout(r, 30));
    await writeFile(path, "a\n");
    await writeFile(path, "b\n");
    await writeFile(path, "c\n");
    await new Promise((r) => setTimeout(r, 300));
    dispose();

    expect(calls).toBe(1);
  });

  it("returns a disposer that stops further notifications", async () => {
    const path = join(dir, "todo.txt");
    await writeFile(path, "first\n");

    let calls = 0;
    const dispose = watch(path, () => {
      calls++;
    });
    dispose();

    await new Promise((r) => setTimeout(r, 30));
    await writeFile(path, "second\n");
    await new Promise((r) => setTimeout(r, 250));

    expect(calls).toBe(0);
  });
});

describe("appendToDone", () => {
  it("appends serialized tasks to done.txt, creating the file if missing", async () => {
    const path = join(dir, "done.txt");
    const tasks = [parseLine("x 2026-05-14 First", 0), parseLine("x 2026-05-14 Second", 1)];
    await appendToDone(path, tasks);

    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.raw).toBe("x 2026-05-14 First\nx 2026-05-14 Second\n");
  });

  it("appends to existing done.txt without truncating", async () => {
    const path = join(dir, "done.txt");
    await writeFile(path, "x 2026-05-13 Old\n");
    await appendToDone(path, [parseLine("x 2026-05-14 New", 0)]);

    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.raw).toBe("x 2026-05-13 Old\nx 2026-05-14 New\n");
  });

  it("is a no-op when given zero tasks", async () => {
    const path = join(dir, "done.txt");
    await writeFile(path, "x 2026-05-13 Existing\n");
    await appendToDone(path, []);
    const result = await read(path);
    if (result === "notfound") throw new Error("expected snapshot");
    expect(result.raw).toBe("x 2026-05-13 Existing\n");
  });
});

describe("writeAtomic — cross-file independence", () => {
  it("a conflict on file B leaves file A in its written state", async () => {
    const aPath = join(dir, "todo.txt");
    const bPath = join(dir, "done.txt");
    await writeFile(aPath, "(A) one\n");
    await writeFile(bPath, "x 2026-05-20 archived\n");

    const snapA = await read(aPath);
    const snapB = await read(bPath);
    if (snapA === "notfound" || snapB === "notfound") throw new Error("expected snapshots");

    const resultA = await writeAtomic(snapA, [parseLine("(A) one", 0), parseLine("(B) two", 1)]);
    expect(resultA.kind).toBe("ok");

    await new Promise((r) => setTimeout(r, 15));
    await writeFile(bPath, "x 2026-05-20 archived\nx 2026-05-21 external edit\n");

    const resultB = await writeAtomic(snapB, []);
    expect(resultB.kind).toBe("conflict");

    const finalA = await read(aPath);
    if (finalA === "notfound") throw new Error("expected snapshot");
    expect(finalA.raw).toBe("(A) one\n(B) two\n");
  });
});
