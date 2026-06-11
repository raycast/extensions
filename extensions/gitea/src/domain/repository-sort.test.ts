import { describe, expect, it } from "vitest";
import type { Repository } from "../types/api";
import { RepositorySort, mapRepositorySortToGitea, sortRepositories } from "./repository-sort";
import { SortOrder } from "./options";

function repo(overrides: Partial<Repository>): Repository {
  return overrides as Repository;
}

describe("repository sort domain", () => {
  const repositories = [
    repo({ full_name: "b", stars_count: 2, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-03T00:00:00Z" }),
    repo({ full_name: "a", stars_count: 5, created_at: "2024-01-03T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
    repo({ full_name: "c", stars_count: 1, created_at: "2024-01-02T00:00:00Z", updated_at: "2024-01-02T00:00:00Z" }),
  ];

  it("sorts repositories by stars", () => {
    expect(sortRepositories(repositories, RepositorySort.MostStars).map((item) => item.full_name)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(sortRepositories(repositories, RepositorySort.FewestStars).map((item) => item.full_name)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("sorts repositories by creation and update timestamps", () => {
    expect(sortRepositories(repositories, RepositorySort.Newest).map((item) => item.full_name)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(sortRepositories(repositories, RepositorySort.LeastRecentlyUpdated).map((item) => item.full_name)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("sorts missing numeric and date values as zero", () => {
    const incompleteRepositories = [
      repo({ full_name: "missing" }),
      repo({ full_name: "zero", stars_count: 0, created_at: "invalid", updated_at: "invalid" }),
      repo({ full_name: "known", stars_count: 10, created_at: "2024-01-01T00:00:00Z" }),
    ];

    expect(sortRepositories(incompleteRepositories, RepositorySort.MostStars).map((item) => item.full_name)).toEqual([
      "known",
      "missing",
      "zero",
    ]);
    expect(sortRepositories(incompleteRepositories, RepositorySort.Newest).map((item) => item.full_name)).toEqual([
      "known",
      "missing",
      "zero",
    ]);
  });

  it("does not mutate the input list", () => {
    const input = [...repositories];

    expect(sortRepositories(input, RepositorySort.MostStars)).not.toBe(input);
    expect(input).toEqual(repositories);
  });

  it.each([
    [RepositorySort.MostStars, { sort: "stars", order: SortOrder.Descending }],
    [RepositorySort.FewestStars, { sort: "stars", order: SortOrder.Ascending }],
    [RepositorySort.Newest, { sort: "created", order: SortOrder.Descending }],
    [RepositorySort.Oldest, { sort: "created", order: SortOrder.Ascending }],
    [RepositorySort.RecentlyUpdated, { sort: "updated", order: SortOrder.Descending }],
    [RepositorySort.LeastRecentlyUpdated, { sort: "updated", order: SortOrder.Ascending }],
  ] as const)("maps %s to Gitea query params", (sort, expected) => {
    expect(mapRepositorySortToGitea(sort)).toEqual(expected);
  });

  it("maps unknown persisted sort values to the default Gitea query params", () => {
    expect(mapRepositorySortToGitea("unknown cached value")).toEqual({
      sort: "stars",
      order: SortOrder.Descending,
    });
    expect(mapRepositorySortToGitea(undefined)).toEqual({
      sort: "stars",
      order: SortOrder.Descending,
    });
  });
});
