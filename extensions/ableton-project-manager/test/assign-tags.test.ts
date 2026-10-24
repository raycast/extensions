import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getAllProjectMetadata,
  saveProjectMetadata,
  setGenreMembers,
  setStageMembers,
} from "../src/core/metadata/project-metadata";

const meta = (over: Partial<Parameters<typeof saveProjectMetadata>[1]> = {}) => ({
  stageId: null,
  genreIds: [],
  collectionIds: [],
  pinned: false,
  pinOrder: null,
  notes: "",
  externalBounceFolders: [],
  externalBounceFiles: [],
  ...over,
});

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("Assign to Projects", () => {
  it("Stage：勾上的改过来，取消的清空，候选以外不动", async () => {
    await saveProjectMetadata("A", meta({ stageId: "mix" }));
    await saveProjectMetadata("B", meta({ stageId: "demo" }));
    await saveProjectMetadata("Gone", meta({ stageId: "mix" }));

    await setStageMembers("mix", ["B", "C"], ["A", "B", "C"]);

    const store = await getAllProjectMetadata();
    expect(store.A.stageId).toBeNull();
    expect(store.B.stageId).toBe("mix");
    expect(store.C.stageId).toBe("mix");
    expect(store.Gone.stageId).toBe("mix");
  });

  it("Genre：只加减这一个，其余 Genre 保留", async () => {
    await saveProjectMetadata("A", meta({ genreIds: ["house", "techno"] }));
    await saveProjectMetadata("B", meta({ genreIds: ["pop"] }));

    await setGenreMembers("house", ["B"], ["A", "B"]);

    const store = await getAllProjectMetadata();
    expect(store.A.genreIds).toEqual(["techno"]);
    expect(store.B.genreIds).toEqual(["pop", "house"]);
  });
});
