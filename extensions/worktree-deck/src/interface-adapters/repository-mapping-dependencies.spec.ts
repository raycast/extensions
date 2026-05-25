import { describe, expect, it, vi } from "vitest";

import { createRepositoryMappingDependencies } from "./repository-mapping-dependencies";

describe("createRepositoryMappingDependencies", () => {
  it("infra を application 用依存に変換する", async () => {
    const infra = {
      loadFromStorage: vi.fn(async () => [{ repoRoot: "/tmp/repo-a", mapValue: "Alpha" }]),
      saveToStorage: vi.fn(async () => {}),
    };

    const deps = createRepositoryMappingDependencies(infra);

    await expect(deps.loadMappingsFromStorage()).resolves.toEqual([{ repoRoot: "/tmp/repo-a", mapValue: "Alpha" }]);
    await deps.saveMappingsToStorage([{ repoRoot: "/tmp/repo-c", mapValue: "Charlie" }]);

    expect(infra.saveToStorage).toHaveBeenCalledWith([{ repoRoot: "/tmp/repo-c", mapValue: "Charlie" }]);
  });
});
