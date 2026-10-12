import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLinks } from "../src/use-links";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ apiKey: "shk_test_only" }) }));
const fetchMock = vi.fn<typeof fetch>();
const link = (id: number) => ({ id: String(id), url: `https://example.com/${id}` });
const response = (ids: number[], total: number) =>
  new Response(JSON.stringify({ success: true, links: ids.map(link), total }));
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
