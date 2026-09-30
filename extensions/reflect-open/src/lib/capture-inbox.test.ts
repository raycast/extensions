import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CaptureInboxError, MAX_CAPTURE_LENGTH, spoolTextCapture } from "./capture-inbox";

/**
 * These tests exercise the real spool against a throwaway graph in the OS temp
 * dir via the injectable `pointerPath` — they never read the machine's real
 * `capture-pointer.json` and so never touch the user's Reflect graph.
 */

let root: string; // temp workspace
let graphRoot: string; // fake graph directory the pointer points at
let pointerPath: string; // fake capture-pointer.json
let inbox: string; // <graphRoot>/.reflect/inbox

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "reflect-open-inbox-"));
  graphRoot = join(root, "graph");
  await mkdir(graphRoot, { recursive: true });
  pointerPath = join(root, "capture-pointer.json");
  await writeFile(pointerPath, JSON.stringify({ version: 1, graphRoot }));
  inbox = join(graphRoot, ".reflect", "inbox");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function inboxEntries(): Promise<string[]> {
  try {
    return (await readdir(inbox)).sort();
  } catch {
    return []; // inbox never created
  }
}

describe("spoolTextCapture", () => {
  it("writes exactly one final <id>.json envelope with the expected fields", async () => {
    const capturedAt = new Date("2026-07-15T13:21:00.000Z");
    await spoolTextCapture("buy milk", "task", { pointerPath, capturedAt });

    const files = await inboxEntries();
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[0-9a-f-]{36}\.json$/);

    const envelope = JSON.parse(await readFile(join(inbox, files[0]), "utf8"));
    expect(envelope).toMatchObject({
      version: 1,
      kind: "task",
      text: "buy milk",
      capturedAt: "2026-07-15T13:21:00.000Z",
      source: "deep-link",
    });
    expect(envelope.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(`${envelope.id}.json`).toBe(files[0]);
  });

  it("leaves no .tmp-* residue behind", async () => {
    await spoolTextCapture("a quiet thought", "append", { pointerPath });
    const files = await inboxEntries();
    expect(files).toEqual([expect.stringMatching(/\.json$/)]);
    expect(files.some((name) => name.startsWith(".tmp-"))).toBe(false);
  });

  it("fails with no-graph and writes nothing when the pointer is missing", async () => {
    await rm(pointerPath, { force: true });
    await expect(spoolTextCapture("x", "append", { pointerPath })).rejects.toMatchObject({
      code: "no-graph",
    });
    expect(await inboxEntries()).toHaveLength(0);
  });

  it("fails and writes nothing when the pointer graph directory is absent", async () => {
    await rm(graphRoot, { recursive: true, force: true });
    await expect(spoolTextCapture("x", "append", { pointerPath })).rejects.toMatchObject({
      code: "no-graph",
    });
    expect(await inboxEntries()).toHaveLength(0);
  });

  it("fails and writes nothing when the pointer JSON is malformed", async () => {
    await writeFile(pointerPath, "{ not json");
    await expect(spoolTextCapture("x", "append", { pointerPath })).rejects.toBeInstanceOf(CaptureInboxError);
    expect(await inboxEntries()).toHaveLength(0);
  });

  it("fails and writes nothing when the pointer version is unsupported", async () => {
    await writeFile(pointerPath, JSON.stringify({ version: 2, graphRoot }));
    await expect(spoolTextCapture("x", "append", { pointerPath })).rejects.toBeInstanceOf(CaptureInboxError);
    expect(await inboxEntries()).toHaveLength(0);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["multiline", "line one\nline two"],
    ["over the length cap", "a".repeat(MAX_CAPTURE_LENGTH + 1)],
  ])("rejects %s input without writing anything", async (_label, text) => {
    await expect(spoolTextCapture(text, "append", { pointerPath })).rejects.toBeInstanceOf(CaptureInboxError);
    expect(await inboxEntries()).toHaveLength(0);
  });

  it("accepts input exactly at the length cap", async () => {
    await spoolTextCapture("a".repeat(MAX_CAPTURE_LENGTH), "append", { pointerPath });
    expect(await inboxEntries()).toHaveLength(1);
  });
});
