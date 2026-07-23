import { afterEach, describe, expect, it, vi } from "vitest";
import type { JsonApiList } from "../jsonapi";

// node-fetch is imported by lib/api; mock it so no real network happens.
vi.mock("node-fetch", () => {
  return { default: vi.fn() };
});

import { authHeaders, fetchAllPages } from "../api";
import fetch from "node-fetch";
const mockedFetch = fetch as unknown as ReturnType<typeof vi.fn>;

const page = (data: unknown[], next: string | null): JsonApiList<unknown> => ({
  data: data as never,
  links: { next },
});

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
});

afterEach(() => {
  mockedFetch.mockReset();
});

describe("authHeaders", () => {
  it("includes JSON headers and a bearer token", () => {
    expect(authHeaders("abc")).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
  });
});

describe("fetchAllPages", () => {
  it("concatenates every page until links.next is null", async () => {
    mockedFetch
      .mockResolvedValueOnce(okResponse(page([{ id: "1" }], "https://next-2")))
      .mockResolvedValueOnce(okResponse(page([{ id: "2" }], null)));

    const all = await fetchAllPages("https://start", { method: "get" });

    expect(all.map((r) => (r as { id: string }).id)).toEqual(["1", "2"]);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch.mock.calls[1][0]).toBe("https://next-2");
  });
});
