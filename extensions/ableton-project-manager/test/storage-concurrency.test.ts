import { describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { StorageUnreadableError, updateJson } from "../src/core/fs/storage";
import {
  getAllProjectMetadata,
  removeCollectionEverywhere,
  saveProjectMetadata,
  type ProjectMetadata,
} from "../src/core/metadata/project-metadata";

const counter = (value: unknown) => (typeof value === "number" ? value : 0);

function metadata(collectionIds: string[]): ProjectMetadata {
  return {
    stageId: null,
    genreIds: [],
    collectionIds,
    pinned: false,
    pinOrder: null,
    notes: "",
    externalBounceFolders: [],
    externalBounceFiles: [],
  };
}

describe("updateJson", () => {
  it("并发更新同一个 key 不会互相覆盖", async () => {
    const key = "test:concurrent";
    await Promise.all([1, 2, 3].map(() => updateJson(key, counter, () => 0, (n) => n + 1)));
    expect(await LocalStorage.getItem<string>(key)).toBe("3");
  });

  it("数据损坏时拒绝写入，原数据保留", async () => {
    const key = "test:corrupt";
    await LocalStorage.setItem(key, "{oops");
    await expect(updateJson(key, counter, () => 0, () => 1)).rejects.toBeInstanceOf(StorageUnreadableError);
    expect(await LocalStorage.getItem<string>(key)).toBe("{oops");
  });
});

describe("project metadata", () => {
  it("并发保存多个项目，全部保留", async () => {
    await Promise.all(["a", "b", "c"].map((id) => saveProjectMetadata(id, metadata(["ep"]))));
    expect(Object.keys(await getAllProjectMetadata()).sort()).toEqual(["a", "b", "c"]);
  });

  it("删除合集后，所有成员都不再包含它", async () => {
    await removeCollectionEverywhere("ep");
    const store = await getAllProjectMetadata();
    for (const id of ["a", "b", "c"]) expect(store[id].collectionIds).not.toContain("ep");
  });
});
