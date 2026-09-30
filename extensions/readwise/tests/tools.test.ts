import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import listBooks from "../src/tools/list-books";
import listHighlights from "../src/tools/list-highlights";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ token: "test-token", pageSize: 500 }),
}));

const mockedFetch = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal("fetch", mockedFetch));
afterEach(() => vi.unstubAllGlobals());

describe("AI tools", () => {
  it("retrieves library entries with category and pagination, preserving the next page", async () => {
    const data = {
      count: 30,
      next: "https://readwise.io/api/v2/books?page=3&page_size=10&category=articles",
      previous: "https://readwise.io/api/v2/books?page=1&page_size=10&category=articles",
      results: [{ id: 42, title: "A Guide to Focus" }],
    };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(listBooks({ category: "articles", page: 2, pageSize: 10 })).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledExactlyOnceWith(
      "https://readwise.io/api/v2/books?category=articles&page=2&page_size=10",
      { method: "get", headers: { Authorization: "Token test-token" } }
    );
  });

  it("retrieves highlights for an entry and date range without dropping notes", async () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 101, book_id: 42, text: "Protect time for focused work.", note: "Turn off notifications." }],
    };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(
      listHighlights({
        bookId: 42,
        highlightedAfter: "2026-01-01T00:00:00Z",
        highlightedBefore: "2026-02-01T00:00:00Z",
        page: 2,
        pageSize: 10,
      })
    ).resolves.toEqual(data);
    const url = new URL(mockedFetch.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v2/highlights");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      book_id: "42",
      highlighted_at__gt: "2026-01-01T00:00:00Z",
      highlighted_at__lt: "2026-02-01T00:00:00Z",
      page: "2",
      page_size: "10",
    });
  });

  it.each([
    { name: "books", tool: listBooks },
    { name: "highlights", tool: listHighlights },
  ])("requests the first page of $name with no filters by default", async ({ name, tool }) => {
    const data = { count: 0, next: null, previous: null, results: [] };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(tool({})).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledWith(
      `https://readwise.io/api/v2/${name}?page=1&page_size=100`,
      expect.any(Object)
    );
  });
});
