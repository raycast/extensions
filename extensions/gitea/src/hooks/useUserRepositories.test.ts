import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositorySort } from "../domain/repository-sort";
import { getRepositories } from "../services/repositories";
import type { Repository } from "../types/api";
import { usePaginatedResource } from "./usePaginatedResource";
import { useUserRepositories } from "./useUserRepositories";

vi.mock("../services/repositories", () => ({
  getRepositories: vi.fn(),
}));

vi.mock("./useCurrentUser", () => ({
  useCurrentUser: vi.fn(() => ({ user: { id: 42, login: "alice" }, isLoading: false })),
}));

const paginatedResource = vi.hoisted(() => ({
  options: undefined as
    | {
        fetchPage: (params: {
          sort?: RepositorySort;
          query?: string;
          uid?: number;
          page: number;
          limit: number;
        }) => Promise<unknown>;
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

const mockedGetRepositories = vi.mocked(getRepositories);
const mockedUsePaginatedResource = vi.mocked(usePaginatedResource);

describe("useUserRepositories", () => {
  beforeEach(() => {
    paginatedResource.options = undefined;
    vi.clearAllMocks();
  });

  it("fetches accessible current-user repositories with server-side search and sorting", async () => {
    const result = useUserRepositories(RepositorySort.RecentlyUpdated, " app ");

    expect(result.items.map((item) => item.full_name)).toEqual(["old", "new"]);
    expect(mockedUsePaginatedResource).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { sort: RepositorySort.RecentlyUpdated, query: "app", uid: 42 },
      }),
    );

    mockedGetRepositories.mockResolvedValue({ items: [], hasMore: false });
    await paginatedResource.options?.fetchPage({
      sort: RepositorySort.RecentlyUpdated,
      query: "app",
      uid: 42,
      page: 3,
      limit: 25,
    });

    expect(mockedGetRepositories).toHaveBeenCalledWith({
      page: 3,
      limit: 25,
      q: "app",
      uid: 42,
      exclusive: false,
      sort: "updated",
      order: "desc",
    });
  });
});

function repository(overrides: Partial<Repository>): Repository {
  return overrides as Repository;
}
