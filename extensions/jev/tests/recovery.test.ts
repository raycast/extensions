import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { Store, parseBackup, readBackup } from "../src/lib/store";
import { initialData } from "../src/lib/model";
import { moveDocument, undoMove } from "../src/lib/files";
import { evaluate } from "../src/lib/client";
let root: string;
let store: Store;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "jev-recovery-"));
  store = new Store(path.join(root, "data"));
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await fs.rm(root, { recursive: true, force: true });
});

describe("recovery without filesystem troubleshooting", () => {
  it("recovers after a real writer is killed without unlocking", async () => {
    await fs.mkdir(store.directory);
    const modulePath = createRequire(import.meta.url).resolve("proper-lockfile");
    const child = spawn(
      process.execPath,
      [
        "-e",
        `require(${JSON.stringify(modulePath)}).lock(${JSON.stringify(store.file)}, {realpath:false,lockfilePath:${JSON.stringify(path.join(store.directory, ".write-lock"))},stale:10000,update:2000}).then(()=>{process.stdout.write('ready');setInterval(()=>{},1000)})`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await once(child.stdout!, "data");
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
      await store.update((d) => {
        d.presets[0]!.name = "Recovered after crash";
      });
      expect((await store.read()).presets[0]!.name).toBe("Recovered after crash");
      await expect(fs.stat(path.join(store.directory, ".write-lock"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      child.kill("SIGKILL");
    }
  }, 25000);
  it("does not silently reset a missing data file when recovery copies exist", async () => {
    await store.update((d) => {
      d.presets[0]!.name = "Saved before deletion";
    });
    await fs.unlink(store.file);
    await expect(store.read()).rejects.toThrow("has not been reset");
    await expect(store.update(() => {})).rejects.toThrow("has not been reset");
    await expect(fs.stat(store.file)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("recovers a legacy abandoned lock automatically", async () => {
    await fs.mkdir(path.join(store.directory, ".write-lock"), { recursive: true });
    const old = new Date(Date.now() - 60000);
    await fs.utimes(path.join(store.directory, ".write-lock"), old, old);
    await store.update((d) => {
      d.presets[0]!.name = "Recovered legacy data";
    });
    expect((await store.read()).presets[0]!.name).toBe("Recovered legacy data");
  });
  it("keeps committed data when the replacement write fails and permits retry", async () => {
    await store.update((d) => {
      d.presets[0]!.name = "Before";
    });
    const before = await fs.readFile(store.file, "utf8");
    // Fail at replacement, after backup creation.
    const rename = vi
      .spyOn(fs, "rename")
      .mockRejectedValueOnce(Object.assign(new Error("Disk full"), { code: "ENOSPC" }));
    await expect(
      store.update((d) => {
        d.presets[0]!.name = "Must not commit";
      }),
    ).rejects.toMatchObject({ code: "ENOSPC" });
    expect(await fs.readFile(store.file, "utf8")).toBe(before);
    vi.restoreAllMocks();
    await store.update((d) => {
      d.presets[0]!.name = "Retry succeeded";
    });
    expect((await store.read()).presets[0]!.name).toBe("Retry succeeded");
    expect((await fs.readdir(store.directory)).some((f) => f.endsWith(".tmp"))).toBe(false);
  });
  it("exports, previews, and restores while retaining current filing history", async () => {
    await store.update((d) => {
      d.presets[0]!.name = "Original";
    });
    const backupFile = await store.exportBackup(root);
    const backup = await readBackup(backupFile);
    const source = path.join(root, "receipt.txt");
    const folder = path.join(root, "receipts");
    await fs.writeFile(source, "Synthetic receipt");
    await fs.mkdir(folder);
    const move = await moveDocument(store, source, folder);
    await store.update((d) => {
      d.presets[0]!.name = "Changed";
    });
    await store.restore(backup);
    expect((await store.read()).presets[0]!.name).toBe("Original");
    expect((await store.read()).moves[0]!.id).toBe(move.id);
    expect(await fs.readFile(move.destination, "utf8")).toBe("Synthetic receipt");
    await undoMove(store, move.id);
    expect(await fs.readFile(source, "utf8")).toBe("Synthetic receipt");
    expect((await store.listBackups()).some((b) => b.name.includes("before-restore"))).toBe(true);
    expect(await fs.readFile(backupFile, "utf8")).not.toContain('"apiKey"');
  });
  it("preserves unreadable current data before explicit recovery", async () => {
    await store.update((d) => {
      d.presets[0]!.name = "Good";
    });
    const backup = await store.read();
    await fs.writeFile(store.file, "broken-data-for-recovery");
    await store.restore(backup);
    expect((await store.read()).presets[0]!.name).toBe("Good");
    const recovery = (await store.listBackups()).find((b) => b.name.includes("before-restore"))!;
    expect(await fs.readFile(recovery.path, "utf8")).toBe("broken-data-for-recovery");
  });
  it("rejects malformed backups, duplicate IDs, and dangling collections", () => {
    expect(() => parseBackup("broken")).toThrow("valid Jev backup");
    const data = initialData();
    data.presets.push(data.presets[0]!);
    expect(() => parseBackup(JSON.stringify(data))).toThrow("valid Jev backup");
    expect(() => parseBackup(JSON.stringify({ format: "jev-backup", version: 99, data: initialData() }))).toThrow(
      "valid Jev backup",
    );
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...initialData(),
          links: [
            {
              id: "l",
              title: "Test",
              url: "https://example.com",
              description: "",
              collectionId: "missing",
              tags: [],
              createdAt: "",
              updatedAt: "",
            },
          ],
        }),
      ),
    ).toThrow("valid Jev backup");
  });
  it("retains ten automatic backups without deleting restore safety copies", async () => {
    await store.restore(initialData());
    await store.restore(initialData());
    for (let i = 0; i < 12; i++)
      await store.update((d) => {
        d.presets[0]!.name = `Version ${i}`;
      });
    const backups = await store.listBackups();
    expect(backups.filter((b) => b.name.includes("automatic"))).toHaveLength(10);
    expect(backups.some((b) => b.name.includes("before-restore"))).toBe(true);
  });
  it("serializes competing file moves and preserves one complete copy", async () => {
    const source = path.join(root, "same.txt");
    const a = path.join(root, "a");
    const b = path.join(root, "b");
    await fs.writeFile(source, "Never lose this content");
    await fs.mkdir(a);
    await fs.mkdir(b);
    const outcomes = await Promise.allSettled([
      moveDocument(store, source, a),
      moveDocument(new Store(store.directory), source, b),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    const move = (await store.read()).moves.find((m) => m.status === "moved")!;
    expect(await fs.readFile(move.destination, "utf8")).toBe("Never lose this content");
  });
});
it("cancels an in-flight request without exposing request details", async () => {
  const controller = new AbortController();
  let requestSignal: AbortSignal | null | undefined;
  vi.stubGlobal("fetch", async (_url: string, options: RequestInit) => {
    requestSignal = options.signal;
    return new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });
  });
  const result = evaluate(
    "test-key",
    "jev-latest",
    "synthetic",
    { q: { type: "noul", instructions: "Test" } },
    controller.signal,
  );
  // Let the SDK construct the request before cancellation.
  await vi.waitFor(() => expect(requestSignal).toBeDefined());
  controller.abort();
  await expect(result).rejects.toThrow("Could not complete");
  expect(requestSignal!.aborted).toBe(true);
});
