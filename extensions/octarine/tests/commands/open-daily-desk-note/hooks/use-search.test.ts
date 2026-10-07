import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DateQuery } from "@lib/daily-desk";
import { ALL_WORKSPACES, type WorkspaceSection } from "@type/notes";
import type { Workspace } from "@type/octarine";

const { useDailyNotes, useLastWorkspace, useOpenDailyNote, useWorkspaces } = vi.hoisted(() => ({
  useDailyNotes: vi.fn(),
  useLastWorkspace: vi.fn(),
  useOpenDailyNote: vi.fn(),
  useWorkspaces: vi.fn(),
}));

vi.mock("react", () => ({
  useMemo: (factory: () => unknown) => factory(),
  useState: () => ["", vi.fn()],
}));
vi.mock("@hooks/use-workspaces", () => ({ useWorkspaces }));
vi.mock("@commands/open-daily-desk-note/hooks/use-last-workspace", () => ({ useLastWorkspace }));
vi.mock("@commands/open-daily-desk-note/hooks/use-notes", () => ({ useDailyNotes }));
vi.mock("@commands/open-daily-desk-note/hooks/use-open-note", () => ({ useOpenDailyNote }));

import { useDailyDeskSearch } from "@commands/open-daily-desk-note/hooks/use-search";

const alpha: Workspace = { name: "Alpha", path: "/tmp/alpha", display: "Alpha (2)" };
const beta: Workspace = { name: "Beta", path: "/tmp/beta" };
const alphaSection: WorkspaceSection = { name: "Alpha (2)", path: "/tmp/alpha", notes: [] };

type SearchOptions = {
  selectedWorkspace?: string;
  dateQuery?: DateQuery | null;
  suggestedDate?: string;
  hasExactMatch?: boolean;
  sections?: WorkspaceSection[];
};

function renderSearch(options: SearchOptions = {}) {
  const {
    selectedWorkspace = ALL_WORKSPACES,
    dateQuery = null,
    suggestedDate,
    hasExactMatch = false,
    sections = [],
  } = options;

  useDailyNotes.mockReturnValue({
    dropdown: [alpha, beta],
    sections,
    isLoading: false,
    hasNotes: false,
    dateQuery,
    suggestedDate,
    hasExactMatch,
    selectedWorkspace,
    setSelectedWorkspace: vi.fn(),
  });

  return useDailyDeskSearch({ requestedWorkspace: "", useLastWorkspaceEnabled: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  useWorkspaces.mockReturnValue({
    workspaces: [alpha, beta],
    status: { isLoading: false, failed: false },
    revalidate: vi.fn(),
  });
  useLastWorkspace.mockReturnValue({
    workspace: undefined,
    isLoading: false,
    remember: vi.fn(),
    clear: vi.fn(),
  });
  useOpenDailyNote.mockReturnValue(vi.fn());
});

describe("useDailyDeskSearch", () => {
  it("builds the suggestion for the last workspace and inserts its section", () => {
    useLastWorkspace.mockReturnValue({
      workspace: alpha,
      isLoading: false,
      remember: vi.fn(),
      clear: vi.fn(),
    });

    const result = renderSearch({
      dateQuery: { kind: "date", iso: "2026-03-26" },
      suggestedDate: "2026-03-26",
    });

    expect(result.results.suggestion).toEqual({
      label: "March 26, 2026",
      date: "2026-03-26",
      target: alpha,
      locked: false,
      sectionPath: "/tmp/alpha",
    });
    expect(result.workspace.target).toEqual(alpha);
    expect(result.results.visibleSections).toEqual([alphaSection]);
    expect(result.results.suggestionInSection).toBe(true);
  });

  it("formats week suggestions", () => {
    useLastWorkspace.mockReturnValue({ workspace: alpha, isLoading: false, remember: vi.fn(), clear: vi.fn() });

    const result = renderSearch({ dateQuery: { kind: "week", week: "2026-W13" }, suggestedDate: "2026-W13" });

    expect(result.results.suggestion?.label).toBe("Week 13, 2026");
  });

  it("hides the suggestion when the typed date has an exact match", () => {
    const result = renderSearch({
      dateQuery: { kind: "date", iso: "2026-03-26" },
      suggestedDate: "2026-03-26",
      hasExactMatch: true,
    });

    expect(result.results.suggestion).toBeUndefined();
    expect(result.results.suggestionInSection).toBe(false);
    expect(result.results.visibleSections).toEqual([]);
  });

  it("locks the suggestion to an explicitly selected workspace", () => {
    useLastWorkspace.mockReturnValue({ workspace: beta, isLoading: false, remember: vi.fn(), clear: vi.fn() });

    const result = renderSearch({
      selectedWorkspace: alpha.path,
      dateQuery: { kind: "date", iso: "2026-03-26" },
      suggestedDate: "2026-03-26",
    });

    expect(result.workspace.grouped).toBe(false);
    expect(result.workspace.target).toEqual(alpha);
    expect(result.results.suggestion).toEqual({
      label: "March 26, 2026",
      date: "2026-03-26",
      target: alpha,
      locked: true,
      sectionPath: undefined,
    });
    expect(result.results.suggestionInSection).toBe(false);
  });

  it("waits for the last workspace load before falling back to it", () => {
    useLastWorkspace.mockReturnValue({ workspace: alpha, isLoading: true, remember: vi.fn(), clear: vi.fn() });

    const result = renderSearch({
      dateQuery: { kind: "date", iso: "2026-03-26" },
      suggestedDate: "2026-03-26",
    });

    expect(result.workspace.target).toBeUndefined();
    expect(result.results.suggestion?.target).toBeUndefined();
    expect(result.results.suggestion?.sectionPath).toBeUndefined();
    expect(result.results.visibleSections).toEqual([]);
  });

  it("keeps the indexed sections when the target already has one", () => {
    useLastWorkspace.mockReturnValue({ workspace: alpha, isLoading: false, remember: vi.fn(), clear: vi.fn() });
    const sections = [alphaSection];

    const result = renderSearch({
      dateQuery: { kind: "date", iso: "2026-03-26" },
      suggestedDate: "2026-03-26",
      sections,
    });

    expect(result.results.visibleSections).toBe(sections);
    expect(result.results.suggestionInSection).toBe(true);
  });

  it("does not suggest anything in browse mode", () => {
    const result = renderSearch();

    expect(result.results.suggestion).toBeUndefined();
    expect(result.results.suggestionInSection).toBe(false);
    expect(result.workspace.target).toBeUndefined();
  });
});
