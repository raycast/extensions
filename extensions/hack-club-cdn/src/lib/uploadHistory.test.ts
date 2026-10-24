import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rmSync } from "node:fs";
import { open, readFile, unlink, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { UploadRecord } from "./types";

const store = new Map<string, string>();

/** Small artificial delay used to force read-modify-write cycles to interleave in tests,
 *  the same way they genuinely can when multiple LocalStorage calls race in the real extension. */
async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// A real temp directory (not mocked) so the file-lock code in uploadHistory.ts exercises the
// genuine `fs/promises` open/unlink/stat calls against the real filesystem. Only `@raycast/api`
// itself is mocked, the same as the existing LocalStorage mock below - we're extending that one
// mock object with an `environment.supportPath` pointing at this directory, rather than adding a
// second, competing mock of `@raycast/api`.
// `vi.mock` factories (and the `vi.hoisted` block that feeds them) are hoisted above all other
// module code - including the top-level `import` statements below - so this can't reference those
// imported bindings directly (they'd still be in their temporal dead zone). Loading the same
// built-ins via `require` inside the hoisted callback sidesteps that ordering problem without
// resorting to a top-level `await` (this project compiles with `module: commonjs`, where `require`
// is available and top-level `await` is not).
const SUPPORT_DIR = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs: typeof import("node:fs") = require("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os: typeof import("node:os") = require("node:os");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path: typeof import("node:path") = require("node:path");
  return fs.mkdtempSync(path.join(os.tmpdir(), "hackclub-cdn-test-"));
});
const LOCK_PATH = join(SUPPORT_DIR, "uploads.lock");

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => {
      await delay(5);
      return store.get(key);
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      await delay(5);
      store.set(key, value);
    }),
  },
  environment: {
    supportPath: SUPPORT_DIR,
  },
}));

import { LocalStorage } from "@raycast/api";
import { addUpload, getUploads, removeUpload, updateUpload } from "./uploadHistory";

function makeRecord(id: string): UploadRecord {
  return {
    id,
    filename: `${id}.png`,
    url: `https://cdn.hackclub.com/${id}/${id}.png`,
    size: 1024,
    contentType: "image/png",
    createdAt: "2026-07-01T00:00:00.000Z",
    sourceType: "file",
  };
}

beforeEach(() => {
  store.clear();
});

afterEach(async () => {
  // Guard against a leftover lock file from a failed assertion mid-test leaking into the next
  // test and forcing it to wait out the stale-lock timeout.
  await unlink(LOCK_PATH).catch(() => undefined);
});

afterAll(() => {
  rmSync(SUPPORT_DIR, { recursive: true, force: true });
});

describe("uploadHistory", () => {
  it("returns an empty array when nothing is stored", async () => {
    expect(await getUploads()).toEqual([]);
  });

  it("adds an upload to the front of the list", async () => {
    await addUpload(makeRecord("a"));
    await addUpload(makeRecord("b"));
    const uploads = await getUploads();
    expect(uploads.map((u) => u.id)).toEqual(["b", "a"]);
  });

  it("caps history at 200 entries, dropping the oldest", async () => {
    for (let i = 0; i < 201; i++) {
      await addUpload(makeRecord(`r${i}`));
    }
    const uploads = await getUploads();
    expect(uploads).toHaveLength(200);
    expect(uploads[0].id).toBe("r200");
    expect(uploads.find((u) => u.id === "r0")).toBeUndefined();
  });

  it("removes an upload by id", async () => {
    await addUpload(makeRecord("a"));
    await addUpload(makeRecord("b"));
    await removeUpload("a");
    const uploads = await getUploads();
    expect(uploads.map((u) => u.id)).toEqual(["b"]);
  });

  it("returns an empty array when stored data is corrupted", async () => {
    store.set("uploads", "not valid json{{{");
    expect(await getUploads()).toEqual([]);
  });

  describe("updateUpload", () => {
    it("patches the matching record's fields while leaving its other fields untouched", async () => {
      await addUpload(makeRecord("a"));
      const updated = await updateUpload("a", { width: 300, height: 200 });
      const record = updated.find((u) => u.id === "a");
      expect(record).toMatchObject({
        id: "a",
        filename: "a.png",
        url: "https://cdn.hackclub.com/a/a.png",
        size: 1024,
        contentType: "image/png",
        createdAt: "2026-07-01T00:00:00.000Z",
        sourceType: "file",
        width: 300,
        height: 200,
      });
    });

    it("leaves other records in the array completely unchanged", async () => {
      await addUpload(makeRecord("a"));
      await addUpload(makeRecord("b"));
      const updated = await updateUpload("b", { width: 100, height: 100 });
      const untouched = updated.find((u) => u.id === "a");
      expect(untouched).toEqual(makeRecord("a"));
    });

    it("preserves array order", async () => {
      await addUpload(makeRecord("a"));
      await addUpload(makeRecord("b"));
      await addUpload(makeRecord("c"));
      const updated = await updateUpload("b", { width: 50, height: 50 });
      expect(updated.map((u) => u.id)).toEqual(["c", "b", "a"]);
    });

    it("persists the patch so a subsequent getUploads reflects it", async () => {
      await addUpload(makeRecord("a"));
      await updateUpload("a", { width: 640, height: 480 });
      const uploads = await getUploads();
      const record = uploads.find((u) => u.id === "a");
      expect(record?.width).toBe(640);
      expect(record?.height).toBe(480);
    });

    it("is a no-op that returns the array unchanged when given an id that doesn't match any record", async () => {
      await addUpload(makeRecord("a"));
      await addUpload(makeRecord("b"));
      const before = await getUploads();
      const updated = await updateUpload("does-not-exist", { width: 10, height: 10 });
      expect(updated).toEqual(before);
    });
  });

  describe("concurrent writes", () => {
    it("loses no records when many addUpload calls race concurrently", async () => {
      // Each addUpload does getItem (5ms) then setItem (5ms) internally. Firing them all via
      // Promise.all (rather than awaiting sequentially) means, on unserialized code, every call's
      // getItem would resolve against the still-empty store before any setItem had landed, so
      // every call would compute `[record, ...[]]` and the final setItem would win, leaving only
      // one record behind. With the cross-process file lock, each call's read-modify-write only
      // starts once the previous one's setItem has completed (and the lock file removed), so all
      // records survive - this is now enforced by a real filesystem lock rather than an
      // in-process queue, so it also holds across separate OS processes, not just within one.
      const ids = Array.from({ length: 10 }, (_, i) => `race-${i}`);
      await Promise.all(ids.map((id) => addUpload(makeRecord(id))));

      const uploads = await getUploads();
      expect(uploads).toHaveLength(10);
      expect(new Set(uploads.map((u) => u.id))).toEqual(new Set(ids));
    });

    it("keeps an update and a concurrent add both reflected when they race", async () => {
      await addUpload(makeRecord("a"));

      // Fire a patch to "a" and an addition of "b" concurrently. Without the file lock, both
      // operations' getItem calls would race against the store as it existed before either
      // setItem lands, so whichever setItem resolves last would silently overwrite the other's
      // effect.
      const [updated] = await Promise.all([updateUpload("a", { width: 300, height: 200 }), addUpload(makeRecord("b"))]);
      void updated;

      const uploads = await getUploads();
      expect(uploads.map((u) => u.id).sort()).toEqual(["a", "b"]);
      const recordA = uploads.find((u) => u.id === "a");
      expect(recordA?.width).toBe(300);
      expect(recordA?.height).toBe(200);
    });

    it("does not lose a remaining record when a removeUpload races with an updateUpload on a different id", async () => {
      await addUpload(makeRecord("a"));
      await addUpload(makeRecord("b"));

      // Delete "a" and patch "b" concurrently. Without the file lock, both read the pre-race
      // two-record array, and whichever setItem resolves last wins outright, discarding the other
      // operation's effect (either the delete of "a" never sticks, or the patch to "b" never
      // sticks).
      await Promise.all([removeUpload("a"), updateUpload("b", { width: 640, height: 480 })]);

      const uploads = await getUploads();
      expect(uploads.map((u) => u.id)).toEqual(["b"]);
      expect(uploads[0].width).toBe(640);
      expect(uploads[0].height).toBe(480);
    });
  });

  describe("cross-process file lock", () => {
    it("recovers from a stale lock file left behind by a crashed process instead of deadlocking", async () => {
      // Simulate a command process that force-quit mid-write, leaving its lock file behind: create
      // the real lock file directly (bypassing addUpload/acquireLock) and backdate its mtime past
      // the staleness threshold.
      const handle = await open(LOCK_PATH, "w");
      await handle.close();
      const staleTime = new Date(Date.now() - 10_000);
      await utimes(LOCK_PATH, staleTime, staleTime);

      // If stale-lock recovery didn't work, this would hang until the lock-acquisition attempts
      // are exhausted and reject with a timeout error instead of resolving quickly.
      await expect(addUpload(makeRecord("stale-recovery"))).resolves.toBeUndefined();

      const uploads = await getUploads();
      expect(uploads.some((u) => u.id === "stale-recovery")).toBe(true);
    });

    it("does not remove the lock file if its contents no longer match the token this call acquired", async () => {
      // Give this call's internal getItem an artificially long delay so there's a wide, reliable
      // window to overwrite the lock file's contents mid-operation - simulating a second process
      // that force-reclaimed the lock (e.g. after wrongly deciding it was stale, or through some
      // other bug) while this call was still legitimately running.
      vi.mocked(LocalStorage.getItem).mockImplementationOnce(async (key: string) => {
        await delay(50);
        return store.get(key);
      });

      const addPromise = addUpload(makeRecord("owner-test"));
      // acquireLock's `open(LOCK_PATH, "wx")` resolves near-instantly compared to the 50ms getItem
      // delay above, so 10ms comfortably lands inside the operation's still-in-flight window
      // without racing acquireLock itself.
      await delay(10);
      await writeFile(LOCK_PATH, "some-other-process-token");
      await addPromise;

      // releaseLock must only remove the lock file when its contents still match the token this
      // specific call acquired. Since we overwrote it with a different token mid-operation,
      // release should have left it alone rather than unconditionally unlinking a lock that (in a
      // real scenario) could by now belong to a third process.
      const remainingContents = await readFile(LOCK_PATH, "utf8");
      expect(remainingContents).toBe("some-other-process-token");

      // Clean up the fake lock file so it doesn't leak into subsequent tests and force them
      // through the stale-lock-recovery path.
      await unlink(LOCK_PATH).catch(() => undefined);
    });
  });
});
