import { describe, expect, it } from "vitest";
import { mergeBounces, parseBounceList, serializeBounceList } from "../src/core/projects/bounce-list";
import type { BounceOwner } from "../src/core/projects/bounce-list";
import type { Bounce, BounceWithSource } from "../src/core/projects/bounces";

const owner = (title: string): BounceOwner => ({
  id: title,
  title,
  folderPath: `/Projects/${title}`,
  externalBounceFolders: [],
  externalBounceFiles: [],
});

const bounce = (name: string, over: Partial<BounceWithSource> = {}): BounceWithSource => ({
  name,
  path: `/Bounces/${name}`,
  createdAt: 1700000000000,
  modifiedAt: 1700000001000,
  size: 1024,
  source: "project",
  available: true,
  ...over,
});

const unmatchedBounce = (name: string): Bounce => ({
  name,
  path: `/Shared/${name}`,
  createdAt: 1700000000000,
  modifiedAt: 1700000001000,
  size: 2048,
});

const keyOf = (p: string) => p;

describe("mergeBounces", () => {
  it("两个项目各有不同文件：全部保留，owners 各一个", () => {
    const result = mergeBounces(
      [
        { owner: owner("A"), bounces: [bounce("a.wav")] },
        { owner: owner("B"), bounces: [bounce("b.wav")] },
      ],
      [],
      keyOf,
    );
    expect(result.map((item) => item.name)).toEqual(["a.wav", "b.wav"]);
    expect(result.map((item) => item.owners.map((o) => o.title))).toEqual([["A"], ["B"]]);
  });

  it("同一个 path 出现在两个项目：只保留一条，owners 有两个，按顺序", () => {
    const shared = bounce("same.wav");
    const result = mergeBounces(
      [
        { owner: owner("A"), bounces: [shared] },
        { owner: owner("B"), bounces: [{ ...shared }] },
      ],
      [],
      keyOf,
    );
    expect(result).toHaveLength(1);
    expect(result[0].owners.map((o) => o.title)).toEqual(["A", "B"]);
  });

  it("available 为 false 的被排除", () => {
    const result = mergeBounces(
      [{ owner: owner("A"), bounces: [bounce("gone.wav", { available: false }), bounce("ok.wav")] }],
      [],
      keyOf,
    );
    expect(result.map((item) => item.name)).toEqual(["ok.wav"]);
  });

  it("unmatched 追加在后面，unmatched 为 true、owners 为空", () => {
    const result = mergeBounces([{ owner: owner("A"), bounces: [bounce("a.wav")] }], [unmatchedBounce("x.wav")], keyOf);
    expect(result.map((item) => item.name)).toEqual(["a.wav", "x.wav"]);
    const last = result[1];
    expect(last.unmatched).toBe(true);
    expect(last.owners).toEqual([]);
    expect(last.source).toBe("shared");
    expect(last.available).toBe(true);
  });

  it("unmatched 的 path 已经出现在某个项目里：跳过", () => {
    const result = mergeBounces(
      [{ owner: owner("A"), bounces: [bounce("a.wav")] }],
      [{ ...unmatchedBounce("a.wav"), path: "/Bounces/a.wav" }],
      keyOf,
    );
    expect(result).toHaveLength(1);
    expect(result[0].unmatched).toBe(false);
  });
});

describe("serializeBounceList / parseBounceList", () => {
  it("序列化再解析，结果和原来一致", () => {
    const items = mergeBounces(
      [{ owner: owner("A"), bounces: [bounce("a.wav")] }],
      [unmatchedBounce("x.wav")],
      keyOf,
    );
    expect(parseBounceList(serializeBounceList(items))).toEqual(items);
  });

  it("空字符串返回 undefined", () => {
    expect(parseBounceList("")).toBeUndefined();
    expect(parseBounceList(undefined)).toBeUndefined();
  });

  it("JSON 坏了返回 undefined", () => {
    expect(parseBounceList("{not json")).toBeUndefined();
  });

  it("version 不对返回 undefined", () => {
    expect(parseBounceList(JSON.stringify({ version: 2, items: [] }))).toBeUndefined();
  });

  it("items 不是数组返回 undefined", () => {
    expect(parseBounceList(JSON.stringify({ version: 1, items: {} }))).toBeUndefined();
  });
});
