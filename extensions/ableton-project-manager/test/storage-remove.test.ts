import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, it } from "vitest";
import { getTrackMap, removeTrackMap, setTrackMap } from "../src/core/metadata/collection-order";
import { getRoleMap, removeRoleMap, setRoleMap } from "../src/core/metadata/collection-roles";

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("删除合集映射也走写入队列", () => {
  it("轨号：先发出的写入不会在删除之后把映射写回来", async () => {
    const write = setTrackMap("ep", { Song: 1 });
    await removeTrackMap("ep");
    await write;
    expect(await LocalStorage.getItem<string>("collection-order:ep")).toBeUndefined();
    expect(await getTrackMap("ep")).toEqual({});
  });

  it("角色：同上", async () => {
    const write = setRoleMap("ep", { Song: "Intro" });
    await removeRoleMap("ep");
    await write;
    expect(await LocalStorage.getItem<string>("collection-roles:ep")).toBeUndefined();
    expect(await getRoleMap("ep")).toEqual({});
  });
});
