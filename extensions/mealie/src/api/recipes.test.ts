import { describe, expect, it, vi } from "vitest";
import { getRecipe, importRecipeFromUrl, searchRecipes } from "./recipes";
import type { MealieClient } from "./client";

function clientStub(overrides: Partial<MealieClient>): MealieClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    getAllPages: vi.fn(),
    ...overrides,
  } as unknown as MealieClient;
}

describe("searchRecipes", () => {
  it("passes the search term and returns items", async () => {
    const get = vi.fn().mockResolvedValue({ items: [{ id: "1", name: "Pizza" }], page: 1, total: 1, total_pages: 1 });
    const client = clientStub({ get });

    await expect(searchRecipes(client, "pizza")).resolves.toEqual([{ id: "1", name: "Pizza" }]);
    expect(get).toHaveBeenCalledWith("/api/recipes", { search: "pizza", page: 1, perPage: 50 });
  });

  it("omits the search parameter when the term is blank", async () => {
    const get = vi.fn().mockResolvedValue({ items: [], page: 1, total: 0, total_pages: 1 });
    const client = clientStub({ get });

    await searchRecipes(client, "   ");
    expect(get).toHaveBeenCalledWith("/api/recipes", { search: undefined, page: 1, perPage: 50 });
  });

  it("tolerates a response without items", async () => {
    const client = clientStub({ get: vi.fn().mockResolvedValue({}) });
    await expect(searchRecipes(client, "x")).resolves.toEqual([]);
  });
});

describe("importRecipeFromUrl", () => {
  it("posts the camelCase body Mealie expects and returns the slug", async () => {
    const post = vi.fn().mockResolvedValue("blech-pizza");
    const client = clientStub({ post });

    await expect(importRecipeFromUrl(client, "https://example.org/r", true)).resolves.toBe("blech-pizza");
    expect(post).toHaveBeenCalledWith("/api/recipes/create/url", {
      url: "https://example.org/r",
      includeTags: true,
      includeCategories: false,
    });
  });
});

describe("getRecipe", () => {
  it("fetches by slug", async () => {
    const get = vi.fn().mockResolvedValue({ id: "1", slug: "blech-pizza" });
    const client = clientStub({ get });

    await expect(getRecipe(client, "blech-pizza")).resolves.toMatchObject({ slug: "blech-pizza" });
    expect(get).toHaveBeenCalledWith("/api/recipes/blech-pizza");
  });
});
