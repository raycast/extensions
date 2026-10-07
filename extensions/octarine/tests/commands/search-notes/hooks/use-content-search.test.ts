import { beforeEach, describe, expect, it, vi } from "vitest";
import { noteSearchKey } from "@commands/search-notes/lib/note-search";
import { showToast } from "../../../__mocks__/@raycast/api";

const { useSQL, revalidate, permissionRef } = vi.hoisted(() => ({
  useSQL: vi.fn(),
  revalidate: vi.fn(),
  permissionRef: { current: null as unknown },
}));

vi.mock("@raycast/utils", () => ({ useSQL }));
vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void) => effect(),
  useMemo: (factory: () => unknown) => factory(),
  useRef: () => permissionRef,
}));

import { useContentSearch } from "@commands/search-notes/hooks/use-content-search";

beforeEach(() => {
  vi.clearAllMocks();
  permissionRef.current = null;
  useSQL.mockReturnValue({
    data: [],
    isLoading: false,
    permissionView: null,
    revalidate,
  });
});

describe("useContentSearch", () => {
  it("does not execute without an enabled non-empty query", () => {
    const result = useContentSearch({ enabled: true, searchText: "" });

    expect(useSQL.mock.calls[0][2]).toMatchObject({ execute: false });
    expect(result.matches.size).toBe(0);
    result.revalidate();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not execute when content search is disabled", () => {
    const onError = vi.fn();
    useSQL.mockReturnValue({ data: [], isLoading: false, permissionView: { type: "permission" }, revalidate });

    const result = useContentSearch({ enabled: false, searchText: "matching", onError });

    expect(useSQL.mock.calls[0][2]).toMatchObject({ execute: false });
    expect(result.isLoading).toBe(false);
    expect(result.matches.size).toBe(0);
    expect(onError).not.toHaveBeenCalled();
  });

  it("maps query rows and revalidates an active search", () => {
    useSQL.mockReturnValue({
      data: [{ queryKey: "matching", workspacePath: "/notes/Work", path: "project.md", excerpt: " matching text " }],
      isLoading: false,
      permissionView: null,
      revalidate,
    });

    const result = useContentSearch({ enabled: true, searchText: "matching" });

    expect(useSQL.mock.calls[0][2]).toMatchObject({ execute: true });
    expect(result.matches.get(noteSearchKey("/notes/Work", "project.md"))).toEqual({
      excerpt: "…matching text…",
    });
    result.revalidate();
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("hides matches while the current query is loading", () => {
    useSQL.mockReturnValue({
      data: [{ queryKey: "matching", workspacePath: "/notes/Work", path: "project.md", excerpt: "old match" }],
      isLoading: true,
      permissionView: null,
      revalidate,
    });

    const result = useContentSearch({ enabled: true, searchText: "matching" });

    expect(result.isLoading).toBe(true);
    expect(result.matches.size).toBe(0);
  });

  it("ignores rows cached for a previous query", () => {
    useSQL.mockReturnValue({
      data: [{ queryKey: "previous", workspacePath: "/notes/Work", path: "project.md", excerpt: "old match" }],
      isLoading: false,
      permissionView: null,
      revalidate,
    });

    const result = useContentSearch({ enabled: true, searchText: "current" });

    expect(result.matches.size).toBe(0);
  });

  it("falls back once when the same permission view persists across renders", () => {
    const permissionView = { type: "permission" };
    const onError = vi.fn();
    useSQL.mockReturnValue({ data: [], isLoading: false, permissionView, revalidate });

    useContentSearch({ enabled: true, searchText: "query", onError });
    useContentSearch({ enabled: true, searchText: "query", onError });

    expect(onError).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Content Search Unavailable",
      message: "Showing title and path matches instead",
    });
  });

  it("reports a query failure and asks the command to fall back", () => {
    const onError = vi.fn();
    useContentSearch({ enabled: true, searchText: "query", onError });
    const options = useSQL.mock.calls[0][2];

    options.onError(new Error("schema changed"));

    expect(onError).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Content Search Unavailable",
      message: "Showing title and path matches instead",
    });
  });
});
