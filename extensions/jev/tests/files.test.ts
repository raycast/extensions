import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { moveDocument, recoverMove, undoMove } from "../src/lib/files";
import { Store } from "../src/lib/store";

let root: string;
let store: Store;

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "jev-file-races-")));
  store = new Store(path.join(root, "data"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

async function files() {
  const source = path.join(root, "receipt.txt");
  const folder = path.join(root, "receipts");
  const destination = path.join(folder, path.basename(source));
  await fs.writeFile(source, "Original receipt");
  await fs.mkdir(folder);
  return { source, folder, destination };
}

describe("filing with concurrent writers", () => {
  it("journals staging before rename and preserves a newly created source file", async () => {
    const { source, folder, destination } = await files();
    const original = await fs.stat(source);
    const rename = fs.rename;
    let staged = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (from === source) {
        expect((await store.read()).moves[0]!.recoveryPath).toBe(to);
        await rename(from, to);
        await fs.writeFile(source, "New receipt at the original path", { flag: "wx" });
        staged = true;
      } else {
        await rename(from, to);
      }
    });

    const move = await moveDocument(store, source, folder);

    expect(staged).toBe(true);
    expect(await fs.readFile(source, "utf8")).toBe("New receipt at the original path");
    expect(await fs.readFile(destination, "utf8")).toBe("Original receipt");
    expect((await fs.stat(destination)).ino).toBe(original.ino);
    expect(move.status).toBe("moved");
    expect((await store.read()).moves[0]!.recoveryPath).toBeUndefined();
  });

  it("preserves writes through an already open handle immediately before staging cleanup", async () => {
    const { source, folder, destination } = await files();
    const handle = await fs.open(source, "r+");
    const original = await handle.stat();
    const unlink = fs.unlink;
    let wrote = false;
    vi.spyOn(fs, "unlink").mockImplementation(async (file) => {
      const move = (await store.read()).moves[0];
      if (move?.recoveryPath === file) {
        await handle.truncate(0);
        await handle.writeFile("Updated by the original open handle");
        wrote = true;
      }
      await unlink(file);
    });

    try {
      await moveDocument(store, source, folder);

      expect(wrote).toBe(true);
      expect(await fs.readFile(destination, "utf8")).toBe("Updated by the original open handle");
      expect((await fs.stat(destination)).ino).toBe(original.ino);
      await expect(fs.stat(source)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await handle.close();
    }
  });

  it("restores a different file that replaces the source immediately before staging", async () => {
    const { source, folder, destination } = await files();
    const replacement = path.join(root, "replacement.txt");
    await fs.writeFile(replacement, "Replacement supplied by another writer");
    const rename = fs.rename;
    let replaced = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (from === source && !replaced) {
        await rename(replacement, source);
        replaced = true;
      }
      await rename(from, to);
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow("changed");

    expect(replaced).toBe(true);
    expect(await fs.readFile(source, "utf8")).toBe("Replacement supplied by another writer");
    await expect(fs.stat(destination)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await store.read()).moves[0]!.status).toBe("failed");
  });

  it("keeps a destination created immediately before the no-overwrite link", async () => {
    const { source, folder, destination } = await files();
    const link = fs.link;
    let raced = false;
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      if (to === destination) {
        await fs.writeFile(destination, "Existing destination from another writer", { flag: "wx" });
        raced = true;
      }
      await link(from, to);
    });

    await expect(moveDocument(store, source, folder)).rejects.toMatchObject({ code: "EEXIST" });

    expect(raced).toBe(true);
    expect(await fs.readFile(destination, "utf8")).toBe("Existing destination from another writer");
    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
  });

  it("retains the staged file and its recovery path when rollback finds the source occupied", async () => {
    const { source, folder, destination } = await files();
    const rename = fs.rename;
    const link = fs.link;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (from === source) await fs.writeFile(source, "New file at the original path", { flag: "wx" });
    });
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      if (to === destination) throw Object.assign(new Error("Destination unavailable"), { code: "EIO" });
      await link(from, to);
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    const move = (await store.read()).moves[0]!;
    expect(move.status).toBe("failed");
    expect(move.recoveryPath).toBeDefined();
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
    expect(await fs.readFile(source, "utf8")).toBe("New file at the original path");
    await expect(fs.stat(destination)).rejects.toMatchObject({ code: "ENOENT" });

    await expect(recoverMove(store, move.id)).rejects.toThrow();
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
    expect(await fs.readFile(source, "utf8")).toBe("New file at the original path");
    expect((await store.read()).moves[0]!.recoveryPath).toBe(move.recoveryPath);
  });

  it("rolls back safely if the destination link reports a different volume", async () => {
    const { source, folder, destination } = await files();
    const link = fs.link;
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      if (to === destination) throw Object.assign(new Error("Cross-device link"), { code: "EXDEV" });
      await link(from, to);
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow();

    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
    await expect(fs.stat(destination)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await store.read()).moves[0]!.status).toBe("failed");
  });

  it("rejects a different destination volume before staging the source", async () => {
    const { source, folder, destination } = await files();
    const stat = fs.stat;
    const rename = vi.spyOn(fs, "rename");
    vi.spyOn(fs, "stat").mockImplementation(async (file, options) => {
      const info = await stat(file, options);
      if (file === folder) Object.defineProperty(info, "dev", { value: Number(info.dev) + 1 });
      return info;
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow("same volume");

    expect(rename.mock.calls.some(([from]) => from === source)).toBe(false);
    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
    await expect(fs.stat(destination)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await fs.readdir(root)).some((name) => name.startsWith(".jev-move-"))).toBe(false);
  });

  it("retains the published inode and recovery path when staging cleanup fails", async () => {
    const { source, folder, destination } = await files();
    const original = await fs.stat(source);
    const unlink = fs.unlink;
    vi.spyOn(fs, "unlink").mockImplementation(async (file) => {
      if ((await store.read()).moves[0]?.recoveryPath === file)
        throw Object.assign(new Error("Cleanup unavailable"), { code: "EACCES" });
      await unlink(file);
    });

    await expect(moveDocument(store, source, folder)).rejects.toThrow("cleanup stopped");

    const move = (await store.read()).moves[0]!;
    expect(move.status).toBe("failed");
    expect(move.recoveryPath).toBeDefined();
    expect(await fs.readFile(destination, "utf8")).toBe("Original receipt");
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
    expect((await fs.stat(destination)).ino).toBe(original.ino);
    expect((await fs.stat(move.recoveryPath!)).ino).toBe(original.ino);
    await expect(fs.stat(source)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(recoverMove(store, move.id)).rejects.toThrow("recovery file remains");
    expect(await fs.readFile(move.recoveryPath!, "utf8")).toBe("Original receipt");
  });

  it("can reconcile a completed transfer when the final journal update fails", async () => {
    const { source, folder, destination } = await files();
    const update = store.update.bind(store);
    const updateSpy = vi.spyOn(store, "update").mockImplementation(async (change) =>
      update(async (data) => {
        await change(data);
        if (data.moves.some((move) => move.status === "moved")) throw new Error("Journal unavailable");
      }),
    );

    await expect(moveDocument(store, source, folder)).rejects.toThrow("Journal unavailable");

    expect(await fs.readFile(destination, "utf8")).toBe("Original receipt");
    await expect(fs.stat(source)).rejects.toMatchObject({ code: "ENOENT" });
    const move = (await store.read()).moves[0]!;
    expect(move.status).not.toBe("moved");
    updateSpy.mockRestore();
    await recoverMove(store, move.id);
    expect((await store.read()).moves[0]!.status).toBe("moved");
    expect((await store.read()).moves[0]!.recoveryPath).toBeUndefined();
  });

  it("preserves a newly created filed path when undo restores the original inode", async () => {
    const { source, folder, destination } = await files();
    const original = await fs.stat(source);
    const move = await moveDocument(store, source, folder);
    const rename = fs.rename;
    let staged = false;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      await rename(from, to);
      if (from === destination) {
        await fs.writeFile(destination, "New file at the filed path", { flag: "wx" });
        staged = true;
      }
    });

    await undoMove(store, move.id);

    expect(staged).toBe(true);
    expect(await fs.readFile(source, "utf8")).toBe("Original receipt");
    expect((await fs.stat(source)).ino).toBe(original.ino);
    expect(await fs.readFile(destination, "utf8")).toBe("New file at the filed path");
    expect((await store.read()).moves[0]!.status).toBe("undone");
  });
});
