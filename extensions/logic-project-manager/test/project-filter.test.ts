import { describe, expect, it } from "vitest";
import {
  createdYears,
  filterByDropdown,
  matchProject,
  parseTagSearch,
  projectKeyWords,
  projectSearchTerms,
  splitPinned,
  tagNames,
  type ProjectSearchContext,
} from "@/core/ui/projects/project-filter";
import type { Project } from "@/core/projects/types";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";

function project(overrides: Partial<Project> & { id: string }): Project {
  return {
    title: overrides.id,
    folderPath: `/projects/${overrides.id}`,
    kind: "folder",
    createdAt: new Date(2025, 5, 1).getTime(),
    inode: 1,
    modifiedAt: new Date(2025, 5, 1).getTime(),
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

const stageOptions: TaxonomyOption[] = [
  { id: "demo", name: "Demo" },
  { id: "mix", name: "Mix" },
];
const genreOptions: TaxonomyOption[] = [
  { id: "house", name: "House" },
  { id: "rnb", name: "R&B" },
];
const collectionOptions: TaxonomyOption[] = [{ id: "ep1", name: "First EP" }];

function context(overrides: Partial<ProjectSearchContext> = {}): ProjectSearchContext {
  return { stageOptions, genreOptions, collectionOptions, currentSets: {}, ...overrides };
}

describe("tagNames", () => {
  it("按 id 顺序取显示名", () => {
    expect(tagNames(["mix", "demo"], stageOptions)).toEqual(["Mix", "Demo"]);
  });

  it("找不到的 id 跳过", () => {
    expect(tagNames(["gone", "demo"], stageOptions)).toEqual(["Demo"]);
  });

  it("空列表返回空数组", () => {
    expect(tagNames([], stageOptions)).toEqual([]);
  });
});

describe("projectSearchTerms", () => {
  it("包含标题、Stage、Genre、合集名和创建年月", () => {
    const terms = projectSearchTerms(
      project({ id: "Demo", stageId: "mix", genreIds: ["rnb"], collectionIds: ["ep1"] }),
      context(),
    );
    expect(terms).toContain("Demo");
    expect(terms).toContain("Mix");
    expect(terms).toContain("rnb");
    expect(terms).toContain("First EP");
    expect(terms).toContain("2025");
    expect(terms).toContain("June");
  });

  it("没有标签时只有标题和日期", () => {
    const terms = projectSearchTerms(project({ id: "Solo" }), context());
    expect(terms).toContain("Solo");
    expect(terms).not.toContain("Mix");
  });
});

describe("projectKeyWords", () => {
  it("有 Key 时带上各种写法", () => {
    const words = projectKeyWords(project({ id: "A" }), context({ currentSets: { A: { metadata: { bpm: 120, timeSignature: "4/4", key: "C Major" } } } }));
    expect(words[0]).toBe("C Major");
    expect(words.length).toBeGreaterThan(1);
  });

  it("没有 Key 时返回空数组", () => {
    expect(projectKeyWords(project({ id: "A" }), context())).toEqual([]);
  });
});

describe("matchProject", () => {
  it("每个词都要命中", () => {
    const p = project({ id: "Demo", stageId: "mix" });
    expect(matchProject(p, "demo mix", context())).toBe(true);
    expect(matchProject(p, "demo house", context())).toBe(false);
  });

  it("空查询命中全部", () => {
    expect(matchProject(project({ id: "Demo" }), "", context())).toBe(true);
  });

  it("BPM 整词对上", () => {
    const p = project({ id: "A" });
    const ctx = context({ currentSets: { A: { metadata: { bpm: 120, timeSignature: "4/4", key: null } } } });
    expect(matchProject(p, "120", ctx)).toBe(true);
    expect(matchProject(p, "121", ctx)).toBe(false);
  });

  it("拍号整词对上", () => {
    const p = project({ id: "A" });
    const ctx = context({ currentSets: { A: { metadata: { bpm: null, timeSignature: "6/8", key: null } } } });
    expect(matchProject(p, "6/8", ctx)).toBe(true);
    expect(matchProject(p, "6/4", ctx)).toBe(false);
  });

  it("Key 整词对上，cm 不会命中 cmaj", () => {
    const p = project({ id: "A" });
    const ctx = context({ currentSets: { A: { metadata: { bpm: null, timeSignature: null, key: "C Major" } } } });
    expect(matchProject(p, "cmaj", ctx)).toBe(true);
    expect(matchProject(p, "cm", ctx)).toBe(false);
  });

  it("没有匹配时返回 false", () => {
    expect(matchProject(project({ id: "Demo" }), "zzz", context())).toBe(false);
  });
});

describe("parseTagSearch", () => {
  it("以 # 开头时是组合搜索", () => {
    expect(parseTagSearch("#demo mix")).toEqual({ isTagSearch: true, isEmptyTagSearch: false, query: "demo mix" });
  });

  it("只有 # 时是空的组合搜索", () => {
    expect(parseTagSearch("#")).toEqual({ isTagSearch: true, isEmptyTagSearch: true, query: "" });
    expect(parseTagSearch("#   ")).toEqual({ isTagSearch: true, isEmptyTagSearch: true, query: "   " });
  });

  it("不以 # 开头时交给模糊搜索", () => {
    expect(parseTagSearch("demo")).toEqual({ isTagSearch: false, isEmptyTagSearch: false, query: "" });
  });

  it("前面的空格不影响判断", () => {
    expect(parseTagSearch("  #demo").isTagSearch).toBe(true);
  });
});

describe("filterByDropdown", () => {
  const projects = [
    project({ id: "A", stageId: "mix", genreIds: ["house"], createdAt: new Date(2024, 0, 1).getTime() }),
    project({ id: "B", stageId: "demo", genreIds: ["rnb"], createdAt: new Date(2025, 0, 1).getTime() }),
  ];

  it("all 返回全部", () => {
    expect(filterByDropdown(projects, "all")).toHaveLength(2);
  });

  it("按 Stage 筛", () => {
    expect(filterByDropdown(projects, "stage:mix").map((p) => p.id)).toEqual(["A"]);
  });

  it("按 Genre 筛", () => {
    expect(filterByDropdown(projects, "genre:rnb").map((p) => p.id)).toEqual(["B"]);
  });

  it("按创建年份筛", () => {
    expect(filterByDropdown(projects, "created:2024").map((p) => p.id)).toEqual(["A"]);
  });

  it("没有匹配时返回空数组", () => {
    expect(filterByDropdown(projects, "stage:gone")).toEqual([]);
  });

  it("认不出的维度返回全部", () => {
    expect(filterByDropdown(projects, "unknown:x")).toHaveLength(2);
  });

  it("空列表返回空数组", () => {
    expect(filterByDropdown([], "stage:mix")).toEqual([]);
  });
});

describe("splitPinned", () => {
  it("置顶的按 pinOrder 排，其余原样返回", () => {
    const projects = [
      project({ id: "A", pinned: true, pinOrder: 2 }),
      project({ id: "B" }),
      project({ id: "C", pinned: true, pinOrder: 1 }),
    ];
    const { pinned, unpinned } = splitPinned(projects);
    expect(pinned.map((p) => p.id)).toEqual(["C", "A"]);
    expect(unpinned.map((p) => p.id)).toEqual(["B"]);
  });

  it("pinOrder 为 null 的排在最后", () => {
    const projects = [
      project({ id: "A", pinned: true, pinOrder: null }),
      project({ id: "B", pinned: true, pinOrder: 5 }),
    ];
    expect(splitPinned(projects).pinned.map((p) => p.id)).toEqual(["B", "A"]);
  });

  it("pinOrder 相同时保持原顺序", () => {
    const projects = [
      project({ id: "A", pinned: true, pinOrder: 1 }),
      project({ id: "B", pinned: true, pinOrder: 1 }),
    ];
    expect(splitPinned(projects).pinned.map((p) => p.id)).toEqual(["A", "B"]);
  });

  it("没有置顶时 pinned 为空", () => {
    const { pinned, unpinned } = splitPinned([project({ id: "A" })]);
    expect(pinned).toEqual([]);
    expect(unpinned).toHaveLength(1);
  });

  it("空列表两边都空", () => {
    expect(splitPinned([])).toEqual({ pinned: [], unpinned: [] });
  });
});

describe("createdYears", () => {
  it("去重并从新到旧", () => {
    const projects = [
      project({ id: "A", createdAt: new Date(2024, 0, 1).getTime() }),
      project({ id: "B", createdAt: new Date(2025, 0, 1).getTime() }),
      project({ id: "C", createdAt: new Date(2024, 6, 1).getTime() }),
    ];
    expect(createdYears(projects)).toEqual([2025, 2024]);
  });

  it("空列表返回空数组", () => {
    expect(createdYears([])).toEqual([]);
  });
});
