// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { Language, SearchType } from "@/types";

import useCachedPosts from "@/hooks/useCachedPosts";
import { useIfUrlExists } from "@/hooks/useIfUrlExists";
import usePosts from "@/hooks/usePosts";
import useSearchApi from "@/hooks/useSearchApi";
import useShowDetails from "@/hooks/useShowDetails";
import useThrottledQuery from "@/hooks/useThrottledQuery";

import { useFetch } from "./mocks/utils";

afterEach(cleanup);
test.each([SearchType.Posts, SearchType.Profiles])(
  "public %s query construction, language, deduplication and empty query",
  (type) => {
    let options: any;
    useFetch.mockImplementation((...args: any[]) => {
      options = args[1];
      const mapped = options.mapResult({
        results: [
          { id: 1, slug: "one" },
          { id: 1, slug: "one" },
        ],
      });
      return { ...mapped, isLoading: false };
    });
    const { result, rerender } = renderHook(
      ({ query, language }: { query: string; language?: Language }) => useSearchApi(type, query, language),
      { initialProps: { query: "words & stuff", language: Language.English } },
    );
    const builder = (useFetch.mock.calls.at(-1) as any)[0];
    const url = new URL(builder({ page: 2 }));
    expect(url.searchParams.get("query")).toBe("words & stuff");
    expect(url.searchParams.get("language")).toBe(Language.English);
    expect(url.searchParams.has("includePlatformResults")).toBe(type === SearchType.Posts);
    expect(url.searchParams.get("page")).toBe("2");
    expect(options.headers).toBeUndefined();
    expect(result.current.data).toHaveLength(1);
    rerender({ query: "", language: undefined as any });
    expect(result.current.data).toEqual([]);
    expect(options.execute).toBe(false);
    expect(new URL(builder({ page: 0 })).searchParams.has("accountId")).toBe(false);
  },
);
test("post and publication cache parsers derive stable IDs and pass through failures", async () => {
  useFetch.mockReturnValue({ data: [], isLoading: true, error: new Error("network") });
  const posts = renderHook(() => usePosts(7));
  const args = useFetch.mock.calls.at(-1) as any;
  expect(args[0]).toBe("https://substack.com/api/v1/profile/posts?profile_user_id=7&offset=0&limit=20");
  expect(await args[1].parseResponse({ json: async () => ({ posts: [{ id: 42, slug: "hello" }] }) })).toMatchObject([
    { _id: "42_hello" },
  ]);
  expect(posts.result.current.error?.message).toBe("network");
  renderHook(() => useCachedPosts("example"));
  const cached = useFetch.mock.calls.at(-1) as any;
  expect(cached[0]).toContain("example.substack.com/api/v1/publication/client-search-cache");
  expect(
    await cached[1].parseResponse({ json: async () => ({ posts: [{ publication_id: 3, slug: "hello" }] }) }),
  ).toMatchObject([{ _id: "3_hello" }]);
});
test("null URL does not execute HEAD requests; failed responses do not exist", async () => {
  useFetch.mockReturnValue({ data: true, isLoading: false });
  const hook = renderHook(({ url }: { url: string | null }) => useIfUrlExists(url), {
    initialProps: { url: null as string | null },
  });
  expect(hook.result.current.exists).toBe(false);
  expect((useFetch.mock.calls.at(-1) as any)[1].execute).toBe(false);
  hook.rerender({ url: "https://example.com" });
  const options = (useFetch.mock.calls.at(-1) as any)[1];
  expect(options.method).toBe("HEAD");
  expect(await options.parseResponse({ ok: false })).toBe(false);
  expect(hook.result.current.exists).toBe(true);
  useFetch.mockReturnValue({ data: true, error: new Error("network") });
  hook.rerender({ url: "https://example.com/other" });
  expect(hook.result.current.exists).toBe(false);
});
test("details reset when the search is cleared", () => {
  const { result, rerender } = renderHook(({ query }) => useShowDetails(query), { initialProps: { query: "hello" } });
  act(() => result.current.setShowDetails(true));
  expect(result.current.showDetails).toBe(true);
  rerender({ query: "" });
  expect(result.current.showDetails).toBe(false);
});
test("queries throttle subsequent changes and report pending state", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useThrottledQuery());
  act(() => result.current[1]("one"));
  act(() => result.current[1]("two"));
  expect(result.current[2]).toBe(true);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current[0]).toBe("two");
  expect(result.current[2]).toBe(false);
});
