import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import type { Repository } from "../types/api";
import { getRepositories, getUserRepositories } from "./repositories";

vi.mock("../api", () => ({
  api: {
    repositories: {
      list: vi.fn(),
      listUser: vi.fn(),
    },
  },
}));

const repositoryApi = vi.mocked(api.repositories);

function repository(overrides: Partial<Repository>): Repository {
  return overrides as Repository;
}

describe("repository services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps repository search results as a paginated result", async () => {
    const items = [repository({ id: 1, full_name: "alice/app" }), repository({ id: 2, full_name: "bob/app" })];
    repositoryApi.list.mockResolvedValue(items);

    await expect(getRepositories({ limit: 2, page: 4, sort: "stars", order: "desc" })).resolves.toEqual({
      items,
      hasMore: true,
    });
    expect(repositoryApi.list).toHaveBeenCalledWith({ limit: 2, page: 4, sort: "stars", order: "desc" });
  });

  it("does not report more repository search pages when no limit is provided", async () => {
    const items = [repository({ id: 1, full_name: "alice/app" })];
    repositoryApi.list.mockResolvedValue(items);

    await expect(getRepositories()).resolves.toEqual({
      items,
      hasMore: false,
    });
  });

  it("wraps user repositories as a paginated result", async () => {
    const items = [repository({ id: 1, full_name: "alice/app" })];
    repositoryApi.listUser.mockResolvedValue(items);

    await expect(getUserRepositories({ limit: 1, page: 2 })).resolves.toEqual({
      items,
      hasMore: true,
    });
    expect(repositoryApi.listUser).toHaveBeenCalledWith({ limit: 1, page: 2 });
  });
});
