import { describe, expect, it } from "vitest";
import {
  analyzedCount,
  durationMinuteDigits,
  durationPlaceholder,
  energyLevelOf,
  energyRanges,
  formatDuration,
  matchesFilter,
  numberCounts,
  sameName,
  splitTracklist,
  totalDuration,
  trackInfoSignature,
} from "@/core/ui/collections/tracklist";
import type { Project } from "@/core/projects/types";
import type { TrackInfo } from "@/core/projects/track-info";

function project(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    title: id,
    folderPath: `/projects/${id}`,
    kind: "folder",
    createdAt: 0,
    inode: 1,
    modifiedAt: 0,
    stageId: null,
    genreIds: [],
    collectionIds: [],
    notes: "",
    lyrics: "",
    pinned: false,
    pinOrder: null,
    setsCount: 1,
    bouncesCount: 0,
    projectFilesCount: null,
    externalBounceFolders: [],
    externalBounceFiles: [],
    ...overrides,
  };
}

function info(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    duration: null,
    rms: null,
    crest: null,
    brightness: null,
    activity: null,
    bpm: null,
    key: null,
    timeSignature: null,
    ...overrides,
  };
}

describe("formatDuration", () => {
  it("不足一小时用 m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(599)).toBe("9:59");
  });

  it("分钟位宽可调", () => {
    expect(formatDuration(65, 2)).toBe("01:05");
  });

  it("超过一小时用 h:mm:ss", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("四舍五入到整秒", () => {
    expect(formatDuration(65.4)).toBe("1:05");
    expect(formatDuration(65.6)).toBe("1:06");
  });
});

describe("sameName", () => {
  it("忽略首尾空格与大小写", () => {
    expect(sameName("Demo", " demo ")).toBe(true);
    expect(sameName("DEMO", "demo")).toBe(true);
  });

  it("不同名字返回 false", () => {
    expect(sameName("Demo", "Demo 2")).toBe(false);
  });

  it("两个空名字算相同", () => {
    expect(sameName("", "  ")).toBe(true);
  });
});

describe("splitTracklist", () => {
  it("有轨号的按号排，同号按标题", () => {
    const members = [project("B"), project("A"), project("C")];
    const { tracked } = splitTracklist(members, { A: 1, B: 1, C: 2 });
    expect(tracked.map((p) => p.id)).toEqual(["A", "B", "C"]);
  });

  it("没有轨号的进 Unsorted，按标题排", () => {
    const members = [project("C"), project("A"), project("B")];
    const { unsorted } = splitTracklist(members, {});
    expect(unsorted.map((p) => p.id)).toEqual(["A", "B", "C"]);
  });

  it("空列表两边都空", () => {
    expect(splitTracklist([], {})).toEqual({ tracked: [], unsorted: [] });
  });

  it("只有一个成员时按有无轨号分到一边", () => {
    expect(splitTracklist([project("A")], { A: 1 }).tracked).toHaveLength(1);
    expect(splitTracklist([project("A")], {}).unsorted).toHaveLength(1);
  });
});

describe("numberCounts", () => {
  it("统计每个号被几首占用", () => {
    const tracked = [project("A"), project("B"), project("C")];
    const counts = numberCounts(tracked, { A: 1, B: 1, C: 2 });
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
  });

  it("空列表返回空 Map", () => {
    expect(numberCounts([], {}).size).toBe(0);
  });
});

describe("energyRanges", () => {
  it("对已排序曲目取 min/max", () => {
    const tracked = [project("A"), project("B")];
    const ranges = energyRanges(tracked, {
      A: info({ crest: 2, brightness: 0.2, activity: 0.1 }),
      B: info({ crest: 8, brightness: 0.8, activity: 0.9 }),
    });
    expect(ranges.crest).toEqual({ min: 2, max: 8 });
    expect(ranges.brightness).toEqual({ min: 0.2, max: 0.8 });
    expect(ranges.activity).toEqual({ min: 0.1, max: 0.9 });
  });

  it("没有数据时都是 0", () => {
    expect(energyRanges([project("A")], {})).toEqual({
      crest: { min: 0, max: 0 },
      brightness: { min: 0, max: 0 },
      activity: { min: 0, max: 0 },
    });
  });

  it("只有一个结果时 min 等于 max", () => {
    const ranges = energyRanges([project("A")], { A: info({ crest: 5 }) });
    expect(ranges.crest).toEqual({ min: 5, max: 5 });
  });

  it("缺某个特征时跳过它", () => {
    const ranges = energyRanges([project("A"), project("B")], {
      A: info({ crest: 3 }),
      B: info({ brightness: 0.5 }),
    });
    expect(ranges.crest).toEqual({ min: 3, max: 3 });
    expect(ranges.brightness).toEqual({ min: 0.5, max: 0.5 });
    expect(ranges.activity).toEqual({ min: 0, max: 0 });
  });
});

describe("totalDuration", () => {
  it("累加已排序曲目的时长", () => {
    expect(totalDuration([project("A"), project("B")], { A: info({ duration: 100 }), B: info({ duration: 50 }) })).toBe(
      150,
    );
  });

  it("缺时长的曲目按 0 算", () => {
    expect(totalDuration([project("A"), project("B")], { A: info({ duration: 100 }) })).toBe(100);
  });

  it("空列表返回 0", () => {
    expect(totalDuration([], {})).toBe(0);
  });
});

describe("durationMinuteDigits", () => {
  it("有曲目达到 10 分钟时补两位", () => {
    expect(durationMinuteDigits([project("A")], { A: info({ duration: 600 }) })).toBe(2);
  });

  it("都不足 10 分钟时一位", () => {
    expect(durationMinuteDigits([project("A")], { A: info({ duration: 599 }) })).toBe(1);
  });

  it("没有数据时一位", () => {
    expect(durationMinuteDigits([project("A")], {})).toBe(1);
  });
});

describe("durationPlaceholder", () => {
  it("宽度和真实时长一致", () => {
    expect(durationPlaceholder(1)).toBe("-:--");
    expect(durationPlaceholder(2)).toBe("--:--");
  });
});

describe("matchesFilter", () => {
  const p = project("A", { stageId: "mix", genreIds: ["house"] });

  it("all 全部通过", () => {
    expect(matchesFilter(p, "all")).toBe(true);
  });

  it("按 Stage 和 Genre 筛", () => {
    expect(matchesFilter(p, "stage:mix")).toBe(true);
    expect(matchesFilter(p, "stage:demo")).toBe(false);
    expect(matchesFilter(p, "genre:house")).toBe(true);
    expect(matchesFilter(p, "genre:rnb")).toBe(false);
  });

  it("认不出的维度全部通过", () => {
    expect(matchesFilter(p, "created:2025")).toBe(true);
  });
});

describe("energyLevelOf", () => {
  const ranges = { crest: { min: 2, max: 10 }, brightness: { min: 0, max: 1 }, activity: { min: 0, max: 1 } };

  it("已排序且有数据时给出 1–5 档", () => {
    const level = energyLevelOf(project("A"), { A: 1 }, { A: info({ crest: 2, brightness: 1, activity: 1 }) }, ranges);
    expect(level).toBe(5);
  });

  it("未排序时返回 null", () => {
    expect(energyLevelOf(project("A"), {}, { A: info({ crest: 2 }) }, ranges)).toBeNull();
  });

  it("没有分析数据时返回 null", () => {
    expect(energyLevelOf(project("A"), { A: 1 }, {}, ranges)).toBeNull();
  });

  it("有数据但三项全缺时返回 null", () => {
    expect(energyLevelOf(project("A"), { A: 1 }, { A: info() }, ranges)).toBeNull();
  });
});

describe("analyzedCount", () => {
  it("数出已经有分析结果的曲目", () => {
    expect(analyzedCount([project("A"), project("B")], { A: info() })).toBe(1);
  });

  it("空列表返回 0", () => {
    expect(analyzedCount([], {})).toBe(0);
  });
});

describe("trackInfoSignature", () => {
  it("内容相同但数组引用不同时签名相同", () => {
    expect(trackInfoSignature([project("A"), project("B")])).toBe(trackInfoSignature([project("A"), project("B")]));
  });

  it("改了 title 签名就变", () => {
    expect(trackInfoSignature([project("A", { title: "A2" })])).not.toBe(trackInfoSignature([project("A")]));
  });

  it("改了 folderPath 签名就变", () => {
    expect(trackInfoSignature([project("A", { folderPath: "/other/A" })])).not.toBe(
      trackInfoSignature([project("A")]),
    );
  });

  it("改了 kind 签名就变", () => {
    expect(trackInfoSignature([project("A", { kind: "package" })])).not.toBe(trackInfoSignature([project("A")]));
  });

  it("改了 externalBounceFolders 签名就变", () => {
    expect(trackInfoSignature([project("A", { externalBounceFolders: ["/ext"] })])).not.toBe(
      trackInfoSignature([project("A")]),
    );
  });

  it("改了 externalBounceFiles 签名就变", () => {
    expect(trackInfoSignature([project("A", { externalBounceFiles: ["/ext/a.wav"] })])).not.toBe(
      trackInfoSignature([project("A")]),
    );
  });

  it("成员增减签名就变", () => {
    expect(trackInfoSignature([project("A"), project("B")])).not.toBe(trackInfoSignature([project("A")]));
  });

  it("只改笔记、歌词、标签时签名不变", () => {
    const before = trackInfoSignature([project("A")]);
    const after = trackInfoSignature([
      project("A", { notes: "新笔记", lyrics: "新歌词", stageId: "s1", genreIds: ["g1"], collectionIds: ["c1"] }),
    ]);
    expect(after).toBe(before);
  });
});
