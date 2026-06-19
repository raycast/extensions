import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositorySort } from "../domain/repository-sort";
import { getUserRepositories } from "../services/repositories";
import type { Repository } from "../types/api";
import { usePaginatedResource } from "./usePaginatedResource";
import { useUserRepositories } from "./useUserRepositories";

vi.mock("react", () => ({
  useMemo: (factory: () => unknown) => factory(),
}));

vi.mock("../services/repositories", () => ({
  getUserRepositories: vi.fn(),
}));

const paginatedResource = vi.hoisted(() => ({
  options: undefined as
    | {
        fetchPage: (params: { sort?: RepositorySort; page: number; limit: number }) => Promise<unknown>;
      }
    | undefined,
}));

vi.mock("./usePaginatedResource", () => ({
  usePaginatedResource: vi.fn((options) => {
    paginatedResource.options = options;
    return {
      items: [
        repository({ full_name: "old", updated_at: "2024-01-01T00:00:00Z" }),
        repository({ full_name: "new", updated_at: "2024-01-03T00:00:00Z" }),
      ],
      isLoading: false,
      revalidate: vi.fn(),
      mutate: vi.fn(),
      pagination: { pageSize: 10, hasMore: false, onLoadMore: vi.fn() },
    };
  }),
}));

const mockedGetUserRepositories = vi.mocked(getUserRepositories);
const mockedUsePaginatedResource = vi.mocked(usePaginatedResource);

describe("useUserRepositories", () => {
  beforeEach(() => {
    paginatedResource.options = undefined;
    vi.clearAllMocks();
  });

  it("sorts current-user repositories client-side without passing sort to the unsupported API endpoint", async () => {
    const result = useUserRepositories(RepositorySort.RecentlyUpdated);

    expect(result.items.map((item) => item.full_name)).toEqual(["new", "old"]);
    expect(mockedUsePaginatedResource).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { sort: RepositorySort.RecentlyUpdated },
      }),
    );

    mockedGetUserRepositories.mockResolvedValue({ items: [], hasMore: false });
    await paginatedResource.options?.fetchPage({
      sort: RepositorySort.RecentlyUpdated,
      page: 3,
      limit: 25,
    });

    expect(mockedGetUserRepositories).toHaveBeenCalledWith({ page: 3, limit: 25 });
  });
});

function repository(overrides: Partial<Repository>): Repository {
  return overrides as Repository;
}
