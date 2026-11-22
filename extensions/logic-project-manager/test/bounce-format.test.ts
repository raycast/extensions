import { describe, expect, it } from "vitest";
import { formatSize, groupBySource, sourceGroupTitle, splitExt } from "@/core/ui/bounces/bounce-format";

describe("formatSize", () => {
  it("小于 1 KB 用字节", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1023)).toBe("1023 B");
  });

  it("按 1024 进位，保留一位小数", () => {
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatSize(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  it("超过 TB 时停在 TB", () => {
    expect(formatSize(1024 ** 5)).toBe("1024.0 TB");
  });
});

describe("splitExt", () => {
  it("拆出主体和后缀", () => {
    expect(splitExt("Demo v2.wav")).toEqual({ stem: "Demo v2", ext: ".wav" });
  });

  it("没有后缀时后缀为空", () => {
    expect(splitExt("Demo")).toEqual({ stem: "Demo", ext: "" });
  });

  it("名字里有多个点时只拆最后一个", () => {
    expect(splitExt("Demo.mix.final.wav")).toEqual({ stem: "Demo.mix.final", ext: ".wav" });
  });

  it("以点开头的隐藏文件没有后缀", () => {
    expect(splitExt(".DS_Store")).toEqual({ stem: ".DS_Store", ext: "" });
  });

  it("空名字返回空", () => {
    expect(splitExt("")).toEqual({ stem: "", ext: "" });
  });
});

describe("sourceGroupTitle", () => {
  it("每种来源都有标题", () => {
    expect(sourceGroupTitle("project")).toBe("Project Folder");
    expect(sourceGroupTitle("shared")).toBe("Shared Folder");
    expect(sourceGroupTitle("external")).toBe("External");
    expect(sourceGroupTitle("unmatched")).toBe("Unmatched Bounces");
  });
});

describe("groupBySource", () => {
  const items = [
    { name: "a", source: "project" as const },
    { name: "b", source: "shared" as const },
    { name: "c", source: "project" as const },
  ];
  const identity = <T,>(list: T[]) => list;

  it("按给定顺序分段，只保留非空段", () => {
    const groups = groupBySource(items, ["project", "shared", "external"], (item) => item.source, identity);
    expect(groups.map((group) => group.key)).toEqual(["project", "shared"]);
    expect(groups[0].items.map((item) => item.name)).toEqual(["a", "c"]);
    expect(groups[0].subtitle).toBe("2");
  });

  it("段内顺序由传入的 sort 决定", () => {
    const reversed = <T,>(list: T[]) => [...list].reverse();
    const groups = groupBySource(items, ["project"], (item) => item.source, reversed);
    expect(groups[0].items.map((item) => item.name)).toEqual(["c", "a"]);
  });

  it("kindOf 返回 null 的项不进入任何段", () => {
    const groups = groupBySource(items, ["project"], () => null, identity);
    expect(groups).toEqual([]);
  });

  it("空列表返回空数组", () => {
    expect(groupBySource([], ["project", "shared"], (item: { source: "project" }) => item.source, identity)).toEqual(
      [],
    );
  });

  it("只有一个结果时也照常分段", () => {
    const groups = groupBySource([items[0]], ["project", "shared"], (item) => item.source, identity);
    expect(groups).toHaveLength(1);
    expect(groups[0].subtitle).toBe("1");
  });
});
