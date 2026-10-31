import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, it } from "vitest";
import { getTrackMap, renameProjectInAllOrders, setTrackMap } from "../src/core/metadata/collection-order";
import { getRoleMap, renameProjectInAllRoles, setRoleMap } from "../src/core/metadata/collection-roles";

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("renameProjectInAllOrders", () => {
  it("在所有合集里把旧 id 迁到新 id，保留轨号，不动其他曲目", async () => {
    await setTrackMap("ep-1", { OldName: 3, Other: 1 });
    await setTrackMap("ep-2", { OldName: 1 });

    await renameProjectInAllOrders("OldName", "NewName");

    expect(await getTrackMap("ep-1")).toEqual({ NewName: 3, Other: 1 });
    expect(await getTrackMap("ep-2")).toEqual({ NewName: 1 });
  });

  it("不含该项目的合集保持原样", async () => {
    await setTrackMap("ep-3", { Other: 2 });

    await renameProjectInAllOrders("OldName", "NewName");

    expect(await getTrackMap("ep-3")).toEqual({ Other: 2 });
  });
});

describe("renameProjectInAllRoles", () => {
  it("迁移角色并清除旧 id 键", async () => {
    await setRoleMap("ep-1", { OldName: "Intro", Other: "Single" });

    await renameProjectInAllRoles("OldName", "NewName");

    const roles = await getRoleMap("ep-1");
    expect(roles).toEqual({ NewName: "Intro", Other: "Single" });
    expect("OldName" in roles).toBe(false);
  });

  it("新 id 下的孤儿残留被迁移值覆盖", async () => {
    await setRoleMap("ep-1", { OldName: "Intro", NewName: "Stale" });

    await renameProjectInAllRoles("OldName", "NewName");

    expect(await getRoleMap("ep-1")).toEqual({ NewName: "Intro" });
  });
});