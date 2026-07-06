import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadRecord } from "./types";

const store = new Map<string, string>();

/** Small artificial delay used to force read-modify-write cycles to interleave in tests,
 *  the same way they genuinely can when multiple LocalStorage calls race in the real extension. */
async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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
}));

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
      // Promise.all (rather than awaiting sequentially) means, on the old unserialized code,
      // every call's getItem would resolve against the still-empty store before any setItem had
      // landed, so every call would compute `[record, ...[]]` and the final setItem would win,
      // leaving only one record behind. With the write queue, each call's read-modify-write only
      // starts once the previous one's setItem has completed, so all records survive.
      const ids = Array.from({ length: 10 }, (_, i) => `race-${i}`);
      await Promise.all(ids.map((id) => addUpload(makeRecord(id))));

      const uploads = await getUploads();
      expect(uploads).toHaveLength(10);
      expect(new Set(uploads.map((u) => u.id))).toEqual(new Set(ids));
    });

    it("keeps an update and a concurrent add both reflected when they race", async () => {
      await addUpload(makeRecord("a"));

      // Fire a patch to "a" and an addition of "b" concurrently. On the old code, both operations'
      // getItem calls would race against the store as it existed before either setItem lands, so
      // whichever setItem resolves last would silently overwrite the other's effect.
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

      // Delete "a" and patch "b" concurrently. On the old code, both read the pre-race two-record
      // array, and whichever setItem resolves last wins outright, discarding the other operation's
      // effect (either the delete of "a" never sticks, or the patch to "b" never sticks).
      await Promise.all([removeUpload("a"), updateUpload("b", { width: 640, height: 480 })]);

      const uploads = await getUploads();
      expect(uploads.map((u) => u.id)).toEqual(["b"]);
      expect(uploads[0].width).toBe(640);
      expect(uploads[0].height).toBe(480);
    });
  });
});
