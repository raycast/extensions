import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_WORKSPACES } from "@type/notes";

const { useContentSearch, useNotes, useWorkspaces, revalidateContent, revalidateNotes, matchOf, state } = vi.hoisted(
  () => ({
    useContentSearch: vi.fn(),
    useNotes: vi.fn(),
    useWorkspaces: vi.fn(),
    revalidateContent: vi.fn(),
    revalidateNotes: vi.fn(),
    matchOf: vi.fn(),
    state: { values: [] as unknown[], index: 0 },
  }),
);

vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const index = state.index++;
    if (index === state.values.length) state.values.push(initial);

    return [
      state.values[index],
      (next: unknown) => {
        state.values[index] =
          typeof next === "function" ? (next as (value: unknown) => unknown)(state.values[index]) : next;
      },
    ];
  },
}));
vi.mock("@hooks/use-workspaces", () => ({ useWorkspaces }));
vi.mock("@commands/search-notes/hooks/use-content-search", () => ({ useContentSearch }));
vi.mock("@commands/search-notes/hooks/use-notes", () => ({ useNotes }));

import { useSearchNotes } from "@commands/search-notes/hooks/use-search";

type Options = {
  searchContent?: boolean;
  showPinnedNotesFirst?: boolean;
};

function renderSearchNotes({ searchContent = false, showPinnedNotesFirst = false }: Options = {}) {
  state.index = 0;
  return useSearchNotes({ searchContent, showPinnedNotesFirst });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.values.length = 0;
  useWorkspaces.mockReturnValue({ workspaces: [], status: { isLoading: false }, revalidate: vi.fn() });
  useContentSearch.mockReturnValue({ matches: new Map(), isLoading: false, revalidate: revalidateContent });
  useNotes.mockReturnValue({
    dropdown: [{ name: "Alpha", path: "/tmp/alpha" }],
    sections: [],
    isLoading: false,
    revalidate: revalidateNotes,
    matchOf,
  });
});

describe("useSearchNotes", () => {
  it("enables content search from the preference", () => {
    const view = renderSearchNotes({ searchContent: true });

    expect(view.mode.contentEnabled).toBe(true);
    expect(useContentSearch).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, searchText: "" }));
  });

  it("passes the workspace filter and pinned preference to the notes hook", () => {
    renderSearchNotes({ showPinnedNotesFirst: true });

    expect(useNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.any(Function),
        searchText: "",
        selectedWorkspace: ALL_WORKSPACES,
        showPinnedNotesFirst: true,
        enabled: true,
      }),
    );
  });

  it("groups results when every workspace is selected", () => {
    const view = renderSearchNotes();

    expect(view.workspace.grouped).toBe(true);
  });

  it("exposes the note match resolver from the notes hook", () => {
    const view = renderSearchNotes();

    expect(view.results.matchOf).toBe(matchOf);
  });

  it("falls back to title and path search when content search fails", () => {
    renderSearchNotes({ searchContent: true });
    const { onError } = useContentSearch.mock.calls[0][0] as { onError: () => void };

    onError();

    expect(renderSearchNotes({ searchContent: true }).mode.contentEnabled).toBe(false);
    expect(useContentSearch).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("toggles the pinned filter applied to notes", () => {
    renderSearchNotes().actions.togglePinned();

    expect(renderSearchNotes().mode.pinnedOnly).toBe(true);
    const { filter } = useNotes.mock.lastCall?.[0] as { filter: (note: { pinned: boolean }) => boolean };
    expect(filter({ pinned: true })).toBe(true);
    expect(filter({ pinned: false })).toBe(false);
  });

  it("toggles content search for the current session", () => {
    renderSearchNotes().actions.toggleContent();

    expect(renderSearchNotes().mode.contentEnabled).toBe(true);
    expect(useContentSearch).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });

  it("refreshes content first and revalidates notes on the next refresh", () => {
    const view = renderSearchNotes();

    view.actions.refresh();

    expect(revalidateContent).toHaveBeenCalled();
    expect(revalidateNotes).not.toHaveBeenCalled();

    renderSearchNotes().actions.refresh();

    expect(revalidateNotes).toHaveBeenCalledOnce();
  });

  it("reports loading from notes or content search", () => {
    useContentSearch.mockReturnValue({ matches: new Map(), isLoading: true, revalidate: revalidateContent });

    expect(renderSearchNotes({ searchContent: true }).isLoading).toBe(true);
  });
});
