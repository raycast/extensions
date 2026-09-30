import fetch, { Response } from "node-fetch";
import { describe, expect, it, vi } from "vitest";
import { fetchReadwise } from "../src/api";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ token: "test-token", pageSize: 500 }),
}));

vi.mock("node-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node-fetch")>()),
  default: vi.fn(),
}));

const mockedFetch = vi.mocked(fetch);

describe("fetchReadwise", () => {
  it("sends an authenticated request with pagination and returns the parsed response", async () => {
    const data = { count: 1, next: null, previous: null, results: [{ id: 42, title: "Deep Work" }] };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(fetchReadwise("/v2/books", { page: 2, page_size: 500 })).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledExactlyOnceWith("https://readwise.io/api/v2/books?page=2&page_size=500", {
      method: "get",
      headers: { Authorization: "Token test-token" },
    });
  });

  it("encodes special characters and omits undefined query parameters", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("{}"));

    await fetchReadwise("/v2/highlights", { search: "focus & café", book_id: undefined });

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://readwise.io/api/v2/highlights?search=focus%20%26%20caf%C3%A9",
      expect.any(Object)
    );
  });

  it("supports an empty query for a detail request", async () => {
    const data = { id: 42, title: "Deep Work" };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(fetchReadwise("/v2/books/42", {})).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledWith("https://readwise.io/api/v2/books/42?", expect.any(Object));
  });

  it.each([401, 403, 429, 500])("includes HTTP status %i in the thrown error", async (status) => {
    mockedFetch.mockResolvedValueOnce(new Response('{"detail":"Request failed"}', { status }));

    await expect(fetchReadwise("/v2/books", {})).rejects.toMatchObject({
      message: "An error occurred while fetching the data.",
      status,
    });
  });

  it("propagates network failures", async () => {
    const error = new Error("Connection refused");
    mockedFetch.mockRejectedValueOnce(error);

    await expect(fetchReadwise("/v2/books", {})).rejects.toBe(error);
  });

  it("rejects responses with invalid JSON", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("not JSON"));

    await expect(fetchReadwise("/v2/books", {})).rejects.toBeInstanceOf(SyntaxError);
  });
});
