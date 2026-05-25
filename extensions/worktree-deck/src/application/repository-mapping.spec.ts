import { describe, expect, it, vi } from "vitest";

import { repositoryMappingUsecase } from "./repository-mapping.usecase";

describe("load", () => {
  it("保存済み storage 優先で mapping を返す", async () => {
    const deps = {
      loadMappingsFromStorage: vi.fn(async () => [{ repoRoot: "/tmp/repo-a", mapValue: "Alpha" }]),
    };

    const result = await repositoryMappingUsecase.load({ dependencies: deps });

    expect(result).toEqual([{ repoRoot: "/tmp/repo-a", mapValue: "Alpha" }]);
  });

  it("storage が空のときは空配列を返す", async () => {
    const deps = {
      loadMappingsFromStorage: vi.fn(async () => []),
    };

    const result = await repositoryMappingUsecase.load({ dependencies: deps });

    expect(result).toEqual([]);
  });
});

describe("save", () => {
  it("正規化済み mapping を storage 保存して返す", async () => {
    const deps = {
      saveMappingsToStorage: vi.fn(async () => {}),
    };

    const result = await repositoryMappingUsecase.save({
      entries: [
        { repoRoot: " /tmp/repo-b ", mapValue: "" },
        { repoRoot: "/tmp/repo-a", mapValue: "Alpha" },
      ],
      dependencies: deps,
    });

    expect(result).toEqual([
      { repoRoot: "/tmp/repo-a", mapValue: "Alpha" },
      { repoRoot: "/tmp/repo-b", mapValue: "repo-b" },
    ]);
    expect(deps.saveMappingsToStorage).toHaveBeenCalledWith(result);
  });
});
