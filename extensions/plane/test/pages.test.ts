import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectPages, nextV1Cursor } from "../src/helpers/paging";
import { MAX_LISTED_PAGES } from "../src/helpers/limits";

const mocks = vi.hoisted(() => ({
  v2: true,
  planeRequest: vi.fn(),
  planeRequestV2: vi.fn(),
}));

vi.mock("../src/api/request", () => ({
  planeRequest: mocks.planeRequest,
  planeRequestV2: mocks.planeRequestV2,
  workspacePath: (...segments: string[]) => ["workspaces", "ws", ...segments].join("/"),
  toResults: <T>(response: T[] | { results?: T[] } | undefined) =>
    !response ? [] : Array.isArray(response) ? response : (response.results ?? []),
}));
vi.mock("../src/api/work-item-backend", () => ({
  getCapabilities: async () => ({ v2: mocks.v2 }),
  invalidateBackend: vi.fn(),
}));

const { getPages } = await import("../src/api/pages");

function rows(from: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: `page-${from + index}`, name: `Page ${from + index}` }));
}

describe("collectPages", () => {
  it("follows the next position until the last page", async () => {
    const positions: (number | undefined)[] = [];
    const result = await collectPages(async (position: number | undefined) => {
      positions.push(position);
      const start = position ?? 0;
      return { rows: rows(start, 2), next: start < 4 ? start + 2 : undefined };
    }, 100);
    expect(positions).toEqual([undefined, 2, 4]);
    expect(result).toEqual({ rows: rows(0, 6), truncated: false });
  });

  it("stops at the cap and reports that more rows exist", async () => {
    const result = await collectPages(async (position: number | undefined) => {
      const start = position ?? 0;
      return { rows: rows(start, 3), next: start + 3 };
    }, 7);
    expect(result.rows.map((row) => row.id)).toEqual(rows(0, 7).map((row) => row.id));
    expect(result.truncated).toBe(true);
  });

  it("isn't truncated when the list ends exactly at the cap", async () => {
    const result = await collectPages(
      async (position: number | undefined) => ({ rows: rows(position ?? 0, 2), next: position ? undefined : 2 }),
      4,
    );
    expect(result).toEqual({ rows: rows(0, 4), truncated: false });
  });

  it("stops on an empty page even when the server sends a cursor", async () => {
    const fetchPage = vi.fn(async () => ({ rows: [], next: "same" }));
    expect(await collectPages(fetchPage, 10)).toEqual({ rows: [], truncated: false });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("reads the v1 cursor only while next_page_results is set", () => {
    expect(nextV1Cursor({ results: [], next_cursor: "100:1:0", next_page_results: true })).toBe("100:1:0");
    expect(nextV1Cursor({ results: [], next_cursor: "100:1:0", next_page_results: false })).toBeUndefined();
    expect(nextV1Cursor([])).toBeUndefined();
  });
});

describe("getPages", () => {
  beforeEach(() => {
    mocks.v2 = true;
    mocks.planeRequest.mockReset();
    mocks.planeRequestV2.mockReset();
  });

  it("follows v2 offset pagination past the first 100 pages", async () => {
    mocks.planeRequestV2.mockImplementation(async (_path: string, { query }: { query: { offset?: number } }) => {
      const offset = query.offset ?? 0;
      return {
        data: rows(offset, offset === 0 ? 100 : 30),
        pagination: { style: "offset" },
        next: offset === 0 ? 100 : null,
      };
    });
    const result = await getPages({});
    expect(result.pages).toHaveLength(130);
    expect(result.truncated).toBe(false);
    expect(mocks.planeRequestV2.mock.calls.map(([, options]) => options.query.offset)).toEqual([undefined, 100]);
  });

  it("follows v2 cursor pagination", async () => {
    mocks.planeRequestV2.mockImplementation(async (_path: string, { query }: { query: { cursor?: string } }) =>
      query.cursor
        ? { data: rows(100, 5), pagination: { style: "cursor" }, has_more: false, next_cursor: null }
        : { data: rows(0, 100), pagination: { style: "cursor" }, has_more: true, next_cursor: "abc" },
    );
    const result = await getPages({ projectId: "p1" });
    expect(result.pages).toHaveLength(105);
    expect(mocks.planeRequestV2.mock.calls[1][0]).toBe("workspaces/ws/projects/p1/pages");
    expect(mocks.planeRequestV2.mock.calls[1][1].query.cursor).toBe("abc");
  });

  it("follows the v1 cursor without v2", async () => {
    mocks.v2 = false;
    mocks.planeRequest.mockImplementation(async (_path: string, { query }: { query: { cursor?: string } }) =>
      query.cursor
        ? { results: rows(100, 1), next_page_results: false }
        : { results: rows(0, 100), next_cursor: "100:1:0", next_page_results: true },
    );
    const result = await getPages({});
    expect(result.pages).toHaveLength(101);
    expect(mocks.planeRequest.mock.calls.map(([, options]) => options.query.cursor)).toEqual([undefined, "100:1:0"]);
  });

  it(`stops at ${MAX_LISTED_PAGES} pages and says what it showed`, async () => {
    mocks.planeRequestV2.mockImplementation(async (_path: string, { query }: { query: { offset?: number } }) => {
      const offset = query.offset ?? 0;
      return { data: rows(offset, 100), pagination: { style: "offset" }, next: offset + 100 };
    });
    const result = await getPages({});
    expect(result.pages).toHaveLength(MAX_LISTED_PAGES);
    expect(result.truncated).toBe(true);
    expect(result.coverage).toBe("Showing the 1,000 most recently updated pages");
    expect(mocks.planeRequestV2).toHaveBeenCalledTimes(MAX_LISTED_PAGES / 100);
  });
});
