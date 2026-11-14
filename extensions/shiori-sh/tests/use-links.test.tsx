import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLinks } from "../src/use-links";
import { deleteLink, updateLinkDetails, updateLinks } from "../src/api";
import { Link } from "../src/types";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ apiKey: "shk_test_only" }) }));
const fetchMock = vi.fn<typeof fetch>();
const link = (id: number, read = false) => ({
  id: String(id),
  url: `https://example.com/${id}`,
  title: `Article ${id}`,
  summary: `Summary ${id}`,
  read_at: read ? "2026-10-01T00:00:00Z" : null,
});
const response = (ids: number[], total: number, read = false) =>
  new Response(JSON.stringify({ success: true, links: ids.map((id) => link(id, read)), total }));
let state: ReturnType<typeof useLinks>;
let renderer: ReactTestRenderer;
function Probe({ search = "", read = "all" }: { search?: string; read?: "all" | "read" | "unread" }) {
  state = useLinks(read, search);
  return null;
}
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  vi.unstubAllGlobals();
});

it("appends pages, deduplicates overlaps, and preserves loaded data on a later error", async () => {
  fetchMock.mockResolvedValueOnce(response([1, 2], 5));
  await act(async () => {
    renderer = create(<Probe />);
  });
  fetchMock.mockResolvedValueOnce(response([2, 3], 5));
  await act(async () => state.pagination.onLoadMore());
  expect(state.links.map((item) => item.id)).toEqual(["1", "2", "3"]);
  expect(state.nextOffset).toBe(4);
  fetchMock.mockResolvedValueOnce(new Response("error", { status: 500 }));
  await act(async () => state.pagination.onLoadMore());
  expect(state.error?.message).toContain("500");
  expect(state.links).toHaveLength(3);
  expect(state.pagination.hasMore).toBe(false);
  fetchMock.mockResolvedValueOnce(response([9], 1));
  await act(async () => {
    await state.revalidate();
  });
  expect(state.links.map((item) => item.id)).toEqual(["9"]);
  expect(state.error).toBeUndefined();
  expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("offset=0");
});

it("cancels and ignores old results when search or read filter changes", async () => {
  let finishOld!: (value: Response) => void;
  let oldSignal: AbortSignal;
  fetchMock.mockImplementationOnce((_url, init) => {
    oldSignal = init!.signal!;
    return new Promise((resolve) => {
      finishOld = resolve;
    });
  });
  await act(async () => {
    renderer = create(<Probe search="old" />);
  });
  fetchMock.mockResolvedValueOnce(response([7], 1));
  await act(async () => renderer.update(<Probe search="new" read="unread" />));
  expect(oldSignal!.aborted).toBe(true);
  await act(async () => finishOld(response([1], 1)));
  expect(state.links.map((item) => item.id)).toEqual(["7"]);
  const url = new URL(String(fetchMock.mock.calls[1][0]));
  expect(url.searchParams.get("search")).toBe("new");
  expect(url.searchParams.get("read")).toBe("unread");
  expect(url.searchParams.get("offset")).toBe("0");
});

it("prevents concurrent load-more requests and aborts on unmount", async () => {
  fetchMock.mockResolvedValueOnce(response([1], 3));
  await act(async () => {
    renderer = create(<Probe />);
  });
  let pendingSignal: AbortSignal;
  fetchMock.mockImplementationOnce((_url, init) => {
    pendingSignal = init!.signal!;
    return new Promise(() => {});
  });
  await act(async () => {
    state.pagination.onLoadMore();
    state.pagination.onLoadMore();
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => renderer.unmount());
  expect(pendingSignal!.aborted).toBe(true);
});

it("does not refetch if a mutation completes after the view unmounts", async () => {
  fetchMock.mockResolvedValueOnce(response([1], 1));
  await act(async () => {
    renderer = create(<Probe />);
  });
  const refreshAfterMutation = state.revalidate;
  await act(async () => renderer.unmount());
  await refreshAfterMutation();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("discards a pending page when the same query is refreshed after a bookmark change", async () => {
  fetchMock.mockResolvedValueOnce(response([1], 3));
  await act(async () => {
    renderer = create(<Probe search="design" read="unread" />);
  });
  let finishOldPage!: (value: Response) => void;
  let oldPageSignal: AbortSignal;
  fetchMock.mockImplementationOnce((_url, init) => {
    oldPageSignal = init!.signal!;
    // Model a response that arrives even though its request was cancelled.
    return new Promise((resolve) => {
      finishOldPage = resolve;
    });
  });
  await act(async () => state.pagination.onLoadMore());

  fetchMock.mockResolvedValueOnce(response([9], 1));
  await act(async () => {
    await state.revalidate();
  });
  expect(oldPageSignal!.aborted).toBe(true);
  await act(async () => finishOldPage(response([2, 3], 3)));

  expect(state.links.map((item) => item.id)).toEqual(["9"]);
  expect(state.total).toBe(1);
  expect(state.nextOffset).toBeNull();
  expect(state.error).toBeUndefined();
  expect(state.isLoading).toBe(false);
  expect(
    fetchMock.mock.calls.map(([url]) => {
      const query = new URL(String(url)).searchParams;
      return [query.get("search"), query.get("read"), query.get("offset")];
    }),
  ).toEqual([
    ["design", "unread", "0"],
    ["design", "unread", "1"],
    ["design", "unread", "0"],
  ]);
});

const ids = (first: number, last: number) => Array.from({ length: last - first + 1 }, (_, index) => first + index);
const saved = () => new Response(JSON.stringify({ success: true, updated: 1, linkId: "151" }));
const offsets = () =>
  fetchMock.mock.calls
    .filter(([, init]) => !init?.method)
    .map(([url]) => new URL(String(url)).searchParams.get("offset"));
async function loadTwoPages(read: "all" | "read" | "unread" = "all", search = "") {
  fetchMock.mockResolvedValueOnce(response(ids(1, 100), 205, read === "read"));
  await act(async () => {
    renderer = create(<Probe read={read} search={search} />);
  });
  fetchMock.mockResolvedValueOnce(response(ids(101, 200), 205, read === "read"));
  await act(async () => state.pagination.onLoadMore());
  expect(state.links).toHaveLength(200);
}
async function toggle(link: Link) {
  const read = !link.read_at;
  await updateLinks([link.id], read);
  return { read_at: read ? "2026-10-13T00:00:00Z" : null };
}
async function remove(link: Link) {
  await deleteLink(link.id);
  return null;
}
async function edit(link: Link) {
  await updateLinkDetails(link.id, "Edited article", "Edited summary");
  return { title: "Edited article", summary: "Edited summary" };
}

it("keeps both loaded pages visible while marking a link read and continues at the existing offset", async () => {
  await loadTwoPages();
  let finishWrite!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  let mutation!: Promise<boolean>;
  await act(async () => {
    mutation = state.mutateLink("151", toggle);
  });
  expect(state.links).toHaveLength(200);
  expect(state.links[150].read_at).toBeNull();
  expect(state.isLoading).toBe(false);
  await act(async () => state.pagination.onLoadMore());
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await act(async () => {
    finishWrite(saved());
    await mutation;
  });
  expect(state.links.map((item) => item.id)).toEqual(ids(1, 200).map(String));
  expect(state.links[150].read_at).not.toBeNull();
  expect(state.total).toBe(205);
  expect(state.nextOffset).toBe(200);
  fetchMock.mockResolvedValueOnce(response(ids(201, 205), 205));
  await act(async () => state.pagination.onLoadMore());
  expect(state.links).toHaveLength(205);
  expect(offsets()).toEqual(["0", "100", "200"]);
});

it.each(["unread", "read"] as const)(
  "removes toggled rows from the %s filter without skipping the next unseen link",
  async (read) => {
    await loadTwoPages(read);
    fetchMock.mockResolvedValueOnce(saved());
    await act(async () => {
      await state.mutateLink("151", toggle);
    });
    expect(state.links).toHaveLength(199);
    expect(state.links.some((item) => item.id === "151")).toBe(false);
    expect(state.total).toBe(204);
    expect(state.nextOffset).toBe(199);
    fetchMock.mockResolvedValueOnce(response(ids(201, 205), 204, read === "read"));
    await act(async () => state.pagination.onLoadMore());
    expect(state.links.map((item) => item.id)).toEqual(
      ids(1, 205)
        .filter((id) => id !== 151)
        .map(String),
    );
    expect(state.pagination.hasMore).toBe(false);
    expect(offsets()).toEqual(["0", "100", "199"]);
  },
);

it("deletes multiple rows in place and ignores a repeated deletion without double-decrementing the cursor", async () => {
  await loadTwoPages();
  fetchMock.mockResolvedValueOnce(saved()).mockResolvedValueOnce(saved());
  let results: boolean[] = [];
  await act(async () => {
    results = await Promise.all([
      state.mutateLink("151", remove),
      state.mutateLink("160", remove),
      state.mutateLink("151", remove),
    ]);
  });
  expect(results).toEqual([true, true, false]);
  expect(state.links).toHaveLength(198);
  expect(state.total).toBe(203);
  expect(state.nextOffset).toBe(198);
  expect(fetchMock).toHaveBeenCalledTimes(4);
  fetchMock.mockResolvedValueOnce(response(ids(201, 205), 203));
  await act(async () => state.pagination.onLoadMore());
  expect(state.links.map((item) => item.id)).toEqual(
    ids(1, 205)
      .filter((id) => id !== 151 && id !== 160)
      .map(String),
  );
  expect(offsets()).toEqual(["0", "100", "198"]);
});

it("serializes repeated toggles using the latest row state, without losing a subsequent edit", async () => {
  await loadTwoPages();
  fetchMock.mockResolvedValueOnce(saved()).mockResolvedValueOnce(saved()).mockResolvedValueOnce(saved());
  await act(async () => {
    await Promise.all([
      state.mutateLink("151", toggle),
      state.mutateLink("151", toggle),
      state.mutateLink("151", edit),
    ]);
  });
  const writes = fetchMock.mock.calls.slice(2).map(([, init]) => JSON.parse(String(init?.body)));
  expect(writes).toEqual([
    { ids: ["151"], read: true },
    { ids: ["151"], read: false },
    { title: "Edited article", summary: "Edited summary" },
  ]);
  expect(state.links[150]).toMatchObject({
    id: "151",
    title: "Edited article",
    summary: "Edited summary",
    read_at: null,
  });
  expect(state.links).toHaveLength(200);
  expect(state.total).toBe(205);
  expect(state.nextOffset).toBe(200);
  expect(offsets()).toEqual(["0", "100"]);
});

it("retains loaded search results after editing and overlaps the next page to account for changed search membership", async () => {
  await loadTwoPages("all", "article");
  fetchMock.mockResolvedValueOnce(saved());
  await act(async () => {
    await state.mutateLink("151", edit);
  });
  expect(state.links[150].title).toBe("Edited article");
  expect(state.links).toHaveLength(200);
  expect(state.nextOffset).toBe(199);
  fetchMock.mockResolvedValueOnce(response(ids(200, 205), 205));
  await act(async () => state.pagination.onLoadMore());
  expect(state.links.map((item) => item.id)).toEqual(ids(1, 205).map(String));
  expect(offsets()).toEqual(["0", "100", "199"]);
});

it("keeps loaded rows and cursor on mutation failure and lets later actions succeed", async () => {
  await loadTwoPages();
  fetchMock.mockResolvedValueOnce(new Response("Server error", { status: 500 })).mockResolvedValueOnce(saved());
  let results: PromiseSettledResult<boolean>[] = [];
  await act(async () => {
    results = await Promise.allSettled([state.mutateLink("151", remove), state.mutateLink("160", toggle)]);
  });
  expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled"]);
  expect(state.links[150].id).toBe("151");
  expect(state.links[159].read_at).not.toBeNull();
  expect(state.links).toHaveLength(200);
  expect(state.total).toBe(205);
  expect(state.nextOffset).toBe(200);
  expect(state.pagination.hasMore).toBe(true);
  expect(offsets()).toEqual(["0", "100"]);
});

it("cancels a pending page on deletion and resumes at the adjusted offset without resurrecting stale results", async () => {
  await loadTwoPages();
  let finishOldPage!: (response: Response) => void;
  let oldSignal!: AbortSignal;
  fetchMock.mockImplementationOnce((_url, init) => {
    oldSignal = init!.signal!;
    return new Promise((resolve) => {
      finishOldPage = resolve;
    });
  });
  await act(async () => state.pagination.onLoadMore());
  fetchMock.mockResolvedValueOnce(saved());
  await act(async () => {
    await state.mutateLink("151", remove);
  });
  expect(oldSignal.aborted).toBe(true);
  expect(state.links).toHaveLength(199);
  expect(state.nextOffset).toBe(199);
  await act(async () => finishOldPage(response(ids(201, 205), 205)));
  expect(state.links).toHaveLength(199);
  fetchMock.mockResolvedValueOnce(response(ids(201, 205), 204));
  await act(async () => state.pagination.onLoadMore());
  expect(state.links.map((item) => item.id)).toEqual(
    ids(1, 205)
      .filter((id) => id !== 151)
      .map(String),
  );
  expect(offsets()).toEqual(["0", "100", "200", "199"]);
});

it("waits for an in-flight write before an explicit refresh and still permits a page-zero reset", async () => {
  await loadTwoPages();
  let finishWrite!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  let mutation!: Promise<boolean>;
  await act(async () => {
    mutation = state.mutateLink("151", remove);
  });
  fetchMock.mockResolvedValueOnce(response(ids(1, 100), 204));
  let refresh!: Promise<void>;
  await act(async () => {
    refresh = state.revalidate();
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await act(async () => {
    finishWrite(saved());
    await mutation;
    await refresh;
  });
  expect(state.links.map((item) => item.id)).toEqual(ids(1, 100).map(String));
  expect(state.total).toBe(204);
  expect(state.nextOffset).toBe(100);
  expect(offsets()).toEqual(["0", "100", "0"]);
});

it("does not apply an old mutation to a new query and waits for the write before fetching it", async () => {
  await loadTwoPages();
  let finishWrite!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  let mutation!: Promise<boolean>;
  await act(async () => {
    mutation = state.mutateLink("151", edit);
  });
  fetchMock.mockResolvedValueOnce(response([151], 1));
  await act(async () => renderer.update(<Probe search="new query" />));
  expect(state.links).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await act(async () => {
    finishWrite(saved());
    await mutation;
  });
  expect(state.links).toEqual([link(151)]);
  expect(state.total).toBe(1);
  expect(state.nextOffset).toBeNull();
});

it("finishes accepted queued writes after unmount without changing the view or refetching", async () => {
  await loadTwoPages();
  let finishWrite!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  let first!: Promise<boolean>;
  let queued!: Promise<boolean>;
  await act(async () => {
    first = state.mutateLink("151", toggle);
    queued = state.mutateLink("160", toggle);
  });
  fetchMock.mockResolvedValueOnce(saved());
  await act(async () => renderer.unmount());
  finishWrite(saved());
  expect(await first).toBe(true);
  expect(await queued).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(offsets()).toEqual(["0", "100"]);
});

it.each(["refresh", "search", "filter"])("finishes all accepted writes before %s reloads the view", async (action) => {
  await loadTwoPages();
  let finishWrite!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishWrite = resolve;
      }),
  );
  let first!: Promise<boolean>;
  let queued!: Promise<boolean>;
  await act(async () => {
    first = state.mutateLink("151", toggle);
    queued = state.mutateLink("160", remove);
  });
  fetchMock.mockResolvedValueOnce(saved()).mockResolvedValueOnce(response([1], 1));
  let refresh: Promise<void> | undefined;
  await act(async () => {
    if (action === "refresh") refresh = state.revalidate();
    else
      renderer.update(
        <Probe search={action === "search" ? "new" : ""} read={action === "filter" ? "unread" : "all"} />,
      );
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  await act(async () => {
    finishWrite(saved());
    expect(await first).toBe(true);
    expect(await queued).toBe(true);
    await refresh;
  });
  expect(fetchMock.mock.calls[3][1]?.method).toBe("DELETE");
  expect(String(fetchMock.mock.calls[3][0])).toMatch(/\/api\/links\/160$/);
  expect(state.links.map((item) => item.id)).toEqual(["1"]);
  expect(state.total).toBe(1);
  expect(offsets()).toEqual(["0", "100", "0"]);
});

it.each(["unread", "read"] as const)(
  "restores a %s row's position and counts when queued toggles bring it back into the filter",
  async (read) => {
    await loadTwoPages(read);
    fetchMock.mockResolvedValueOnce(saved()).mockResolvedValueOnce(saved());
    await act(async () => {
      await Promise.all([state.mutateLink("151", toggle), state.mutateLink("151", toggle)]);
    });
    expect(state.links.map((item) => item.id)).toEqual(ids(1, 200).map(String));
    expect(Boolean(state.links[150].read_at)).toBe(read === "read");
    expect(state.total).toBe(205);
    expect(state.nextOffset).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  },
);
