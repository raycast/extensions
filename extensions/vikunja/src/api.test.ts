import { afterEach, beforeEach, vi } from "vitest";
import { getLabels, getProjects } from "./api";

/** Builds a fetch Response-like object carrying the pagination header. */
function page(body: unknown, totalPages: number) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-pagination-total-pages"
          ? String(totalPages)
          : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function label(id: number) {
  return { id, title: `label-${id}`, hex_color: "" };
}

function project(id: number) {
  return {
    id,
    title: `project-${id}`,
    description: "",
    is_archived: false,
    parent_project_id: null,
    hex_color: "",
    identifier: `P${id}`,
  };
}

describe("getLabels pagination", () => {
  it("returns a single page unchanged", async () => {
    fetchMock.mockResolvedValueOnce(page([label(1), label(2)], 1));

    const labels = await getLabels();

    expect(labels).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows every page reported by the header", async () => {
    fetchMock
      .mockResolvedValueOnce(page([label(1), label(2)], 3))
      .mockResolvedValueOnce(page([label(3), label(4)], 3))
      .mockResolvedValueOnce(page([label(5)], 3));

    const labels = await getLabels();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(labels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("requests successive page numbers", async () => {
    fetchMock
      .mockResolvedValueOnce(page([label(1)], 2))
      .mockResolvedValueOnce(page([label(2)], 2));

    await getLabels();

    expect(fetchMock.mock.calls[0][0]).toContain("page=1");
    expect(fetchMock.mock.calls[1][0]).toContain("page=2");
  });

  it("stops after one page when the header is missing", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [label(1)],
      text: async () => "[]",
    });

    const labels = await getLabels();

    expect(labels).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on a failed request", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => "unauthorized",
    });

    await expect(getLabels()).rejects.toThrow(/401/);
  });
});

describe("getProjects pagination", () => {
  it("aggregates pages and filters archived projects", async () => {
    const archived = { ...project(9), is_archived: true };
    fetchMock
      .mockResolvedValueOnce(page([project(1), archived], 2))
      .mockResolvedValueOnce(page([project(2)], 2));

    const projects = await getProjects();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(projects.map((p) => p.id)).toEqual([1, 2]);
  });

  it("keeps archived projects when asked", async () => {
    const archived = { ...project(9), is_archived: true };
    fetchMock.mockResolvedValueOnce(page([project(1), archived], 1));

    const projects = await getProjects(true);

    expect(projects.map((p) => p.id)).toEqual([1, 9]);
  });

  it("appends the page param with & when a query already exists", async () => {
    fetchMock.mockResolvedValueOnce(page([project(1)], 1));

    await getProjects();

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/\/projects\?page=1$/);
  });
});
