import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadRecord } from "./types";

const store = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => store.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
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
});
