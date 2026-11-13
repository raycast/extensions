import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { moveDocument, recoverMove, undoMove } from "../src/lib/files";
import { Store } from "../src/lib/store";

let root: string;
let store: Store;

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "jev-folder-races-")));
  store = new Store(path.join(root, "data"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

async function files() {
  const inbox = path.join(root, "inbox");
  const library = path.join(root, "library");
  const folder = path.join(library, "receipts");
  const foreign = path.join(root, "elsewhere");
  await fs.mkdir(inbox);
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(foreign);
  const source = path.join(inbox, "receipt.txt");
  const destination = path.join(folder, path.basename(source));
  await fs.writeFile(source, "Original receipt");
  return { source, inbox, library, folder, foreign, destination };
}

describe("destination folder changes during filing", () => {
  it("rejects a symlink swap after initial validation and before staging", async () => {
    const { source, folder, foreign, destination } = await files();
    const previousFolder = path.join(root, "previous-receipts");
    const update = store.update.bind(store);
    let swapped = false;
    vi.spyOn(store, "update").mockImplementation(async (change) => {
      const data = await update(change);
      const pending = data.moves.find((move) => move.destination === destination && move.status === "pending");
      if (pending && !pending.recoveryPath && !swapped) {
        swapped = true;
        await fs.rename(folder, previousFolder);
        await fs.symlink(foreign, folder);
      }
      return data;
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    expect(swapped).toBe(true);
    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
    expect(await fs.readdir(foreign)).toEqual([]);
    expect(await fs.readdir(previousFolder)).toEqual([]);
    expect((await store.read()).moves[0]!.status).toBe("failed");
  });

  it("rejects a replacement directory with the same path but a different inode", async () => {
    const { source, folder } = await files();
    const previousFolder = path.join(root, "previous-receipts");
    const rename = fs.rename;
    let swapped = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (from === source) {
        await rename(folder, previousFolder);
        await fs.mkdir(folder);
        swapped = true;
      }
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    expect(swapped).toBe(true);
    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
    expect(await fs.readdir(folder)).toEqual([]);
    expect(await fs.readdir(previousFolder)).toEqual([]);
    expect((await store.read()).moves[0]!.status).toBe("failed");
    expect((await store.read()).moves[0]!.recoveryPath).toBeUndefined();
  });

  it("rejects an ancestor symlink swap before publication", async () => {
    const { source, library, folder, foreign } = await files();
    const previousLibrary = path.join(root, "previous-library");
    const foreignFolder = path.join(foreign, "receipts");
    await fs.mkdir(foreignFolder);
    const rename = fs.rename;
    let swapped = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (from === source) {
        await rename(library, previousLibrary);
        await fs.symlink(foreign, library);
        swapped = true;
      }
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    expect(swapped).toBe(true);
    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
    expect(await fs.readdir(foreignFolder)).toEqual([]);
    expect(await fs.readdir(path.join(previousLibrary, "receipts"))).toEqual([]);
    expect((await store.read()).moves[0]!.status).toBe("failed");
  });

  it("keeps the recovery inode if the folder is redirected inside the destination link", async () => {
    const { source, folder, foreign, destination } = await files();
    const original = await fs.stat(source);
    const previousFolder = path.join(root, "previous-receipts");
    const foreignFile = path.join(foreign, path.basename(source));
    const link = fs.link;
    const unlink = vi.spyOn(fs, "unlink");
    let swapped = false;
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      if (to === destination) {
        await fs.rename(folder, previousFolder);
        await fs.symlink(foreign, folder);
        swapped = true;
      }
      await link(from, to);
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    expect(swapped).toBe(true);
    const move = (await store.read()).moves[0]!;
    expect(move.status).toBe("failed");
    expect(move.recoveryPath).toBeDefined();
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
    expect((await fs.stat(move.recoveryPath!)).ino).toBe(original.ino);
    expect(await fs.readFile(foreignFile, "utf8")).toBe("Original receipt");
    expect((await fs.stat(foreignFile)).ino).toBe(original.ino);
    expect(unlink.mock.calls.some(([file]) => file === move.recoveryPath || file === destination)).toBe(false);
    await expect(recoverMove(store, move.id)).rejects.toThrow();
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
  });

  it("does not unlink an unrelated redirected path after publication", async () => {
    const { source, folder, foreign, destination } = await files();
    const previousFolder = path.join(root, "previous-receipts");
    const foreignFile = path.join(foreign, path.basename(source));
    await fs.writeFile(foreignFile, "Unrelated receipt in the replacement folder");
    const link = fs.link;
    const unlink = vi.spyOn(fs, "unlink");
    let swapped = false;
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      await link(from, to);
      if (to === destination) {
        await fs.rename(folder, previousFolder);
        await fs.symlink(foreign, folder);
        swapped = true;
      }
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    expect(swapped).toBe(true);
    const move = (await store.read()).moves[0]!;
    expect(move.status).toBe("failed");
    expect(move.recoveryPath).toBeDefined();
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
    expect(await fs.readFile(path.join(previousFolder, path.basename(source)), "utf8")).toBe("Original receipt");
    expect(await fs.readFile(foreignFile, "utf8")).toBe("Unrelated receipt in the replacement folder");
    expect(unlink.mock.calls.some(([file]) => file === move.recoveryPath || file === destination)).toBe(false);
  });

  it("restores the filed document if the undo target is replaced after validation", async () => {
    const { source, inbox, folder, foreign, destination } = await files();
    const move = await moveDocument(store, source, folder);
    const previousInbox = path.join(root, "previous-inbox");
    const rename = fs.rename;
    let swapped = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (from === destination) {
        await rename(inbox, previousInbox);
        await fs.symlink(foreign, inbox);
        swapped = true;
      }
    });

    await expect(undoMove(store, move.id)).rejects.toThrow();

    expect(swapped).toBe(true);
    expect(await fs.readFile(destination, "utf8")).toBe("Original receipt");
    expect(await fs.readdir(foreign)).toEqual([]);
    expect(await fs.readdir(previousInbox)).toEqual([]);
    expect((await store.read()).moves[0]!.status).toBe("moved");
    expect((await store.read()).moves[0]!.recoveryPath).toBeUndefined();
  });

  it("retains the last known recovery path when the source parent moves after staging", async () => {
    const { source, inbox, folder, destination } = await files();
    const previousInbox = path.join(root, "previous-inbox");
    const rename = fs.rename;
    const unlink = vi.spyOn(fs, "unlink");
    let stagedPath: string | undefined;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (from === source) {
        stagedPath = String(to);
        await rename(inbox, previousInbox);
        await fs.mkdir(inbox);
      }
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow("last known location");

    expect(stagedPath).toBeDefined();
    const move = (await store.read()).moves[0]!;
    const actualRecoveryPath = path.join(previousInbox, path.relative(inbox, stagedPath!));
    expect(move.status).toBe("failed");
    expect(move.recoveryPath).toBe(stagedPath);
    expect(move.error).toContain("last known location");
    expect(await fs.readFile(actualRecoveryPath, "utf8")).toBe("Original receipt");
    await expect(fs.stat(stagedPath!)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(destination)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readdir(inbox)).toEqual([]);
    expect(unlink.mock.calls.some(([file]) => file === stagedPath || file === actualRecoveryPath)).toBe(false);
    await expect(recoverMove(store, move.id)).rejects.toThrow();
    expect((await store.read()).moves[0]!.recoveryPath).toBe(stagedPath);
    expect(await fs.readFile(actualRecoveryPath, "utf8")).toBe("Original receipt");
  });
});
