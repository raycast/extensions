import { describe, expect, it } from "vitest";
import {
  activeAfterRemoval,
  duplicateName,
  nameForV2,
  nextFreeIndex,
} from "@/daws/logic/alternative-rules";

describe("nextFreeIndex", () => {
  it("取最小的空号", () => {
    expect(nextFreeIndex([0, 1, 3, 4])).toBe(2);
    expect(nextFreeIndex([0, 3, 4])).toBe(1);
    expect(nextFreeIndex([])).toBe(0);
  });
});

describe("duplicateName", () => {
  it("没被占用时叫「原名 #1」", () => {
    expect(duplicateName("Copy Test", [])).toBe("Copy Test #1");
  });

  it("「原名 #1」已存在时叫「原名 #2」", () => {
    expect(duplicateName("Copy Test", ["Copy Test #1"])).toBe("Copy Test #2");
  });

  it("原名已经带 #N 时先去掉再编号", () => {
    expect(duplicateName("Copy Test #1", ["Copy Test #1"])).toBe("Copy Test #2");
  });
});

describe("nameForV2", () => {
  it("名字就是项目名时换成占位符", () => {
    expect(nameForV2("Demo", "Demo")).toBe("{PROJECT_NAME}");
  });

  it("以「项目名 + 空格」开头时只换项目名部分", () => {
    expect(nameForV2("Demo #2", "Demo")).toBe("{PROJECT_NAME} #2");
  });

  it("只是前缀相同、或完全无关的名字原样保留", () => {
    expect(nameForV2("Demolition", "Demo")).toBe("Demolition");
    expect(nameForV2("Verse", "Demo")).toBe("Verse");
  });
});

describe("activeAfterRemoval", () => {
  it("有下一个编号时用下一个", () => {
    expect(activeAfterRemoval([0, 3, 4, 6], 3)).toBe(4);
  });

  it("没有下一个时用上一个", () => {
    expect(activeAfterRemoval([0, 3, 4, 6], 6)).toBe(4);
  });

  it("删的是最小编号时用下一个", () => {
    expect(activeAfterRemoval([0, 3], 0)).toBe(3);
  });

  it("一个都不剩时为 null", () => {
    expect(activeAfterRemoval([5], 5)).toBeNull();
  });
});
