import { describe, expect, it } from "vitest";

import { repositoryMappingService } from "./repository-mapping.service";

describe("normalizeRepositoryMappings", () => {
  it("repoRoot重複時は後勝ちで正規化する", () => {
    const result = repositoryMappingService.normalize([
      { repoRoot: " /tmp/repo-a ", mapValue: " first " },
      { repoRoot: "", mapValue: "ignored" },
      { repoRoot: "/tmp/repo-a", mapValue: "second" },
      { repoRoot: "/tmp/repo-b" },
    ]);

    expect(result).toEqual([
      { repoRoot: "/tmp/repo-a", mapValue: "second" },
      { repoRoot: "/tmp/repo-b", mapValue: "repo-b" },
    ]);
  });
});

describe("sortRepositoryMappings", () => {
  it("mapValueとrepoRootの順でソートする", () => {
    const result = repositoryMappingService.sort([
      { repoRoot: "/z", mapValue: "bbb" },
      { repoRoot: "/a", mapValue: "aaa" },
      { repoRoot: "/b", mapValue: "aaa" },
    ]);

    expect(result).toEqual([
      { repoRoot: "/a", mapValue: "aaa" },
      { repoRoot: "/b", mapValue: "aaa" },
      { repoRoot: "/z", mapValue: "bbb" },
    ]);
  });
});

describe("parseRepositoryMappingsFromStorageValue", () => {
  it("オブジェクト形式とJSON文字列形式を正規化して扱える", () => {
    const objectResult = repositoryMappingService.parseFromStorageValue({
      "/tmp/repo-a": "Alpha",
      "/tmp/repo-b": "",
    });
    const stringResult = repositoryMappingService.parseFromStorageValue(
      JSON.stringify([{ repoRoot: "/tmp/repo-c", mapValue: "Charlie" }]),
    );

    expect(objectResult).toEqual([
      { repoRoot: "/tmp/repo-a", mapValue: "Alpha" },
      { repoRoot: "/tmp/repo-b", mapValue: "repo-b" },
    ]);
    expect(stringResult).toEqual([{ repoRoot: "/tmp/repo-c", mapValue: "Charlie" }]);
  });
});
