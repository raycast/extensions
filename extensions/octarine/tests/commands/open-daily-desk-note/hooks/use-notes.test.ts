import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@type/octarine";
import { setMockPreferences } from "../../../__mocks__/@raycast/api";

const { getDailyNotes, setSelectedWorkspace, useCachedPromise, useNoteSections } = vi.hoisted(() => ({
  getDailyNotes: vi.fn(),
  setSelectedWorkspace: vi.fn(),
  useCachedPromise: vi.fn(),
  useNoteSections: vi.fn(),
}));

vi.mock("@raycast/utils", () => ({ useCachedPromise }));
vi.mock("@lib/notes", () => ({ getDailyNotes }));
vi.mock("@hooks/use-note-sections", () => ({ useNoteSections }));
vi.mock("react", () => ({
  useEffect: (effect: () => void) => effect(),
  useMemo: (factory: () => unknown) => factory(),
  useRef: <T>(value: T) => ({ current: value }),
  useState: () => ["all", setSelectedWorkspace],
}));

import { useDailyNotes } from "@commands/open-daily-desk-note/hooks/use-notes";

const alpha = { name: "Alpha", path: "/tmp/alpha" };
const empty = { name: "Empty", path: "/tmp/empty" };
const workspaces: Workspace[] = [alpha, empty];

beforeEach(() => {
  vi.clearAllMocks();
  getDailyNotes.mockResolvedValue([]);
  useCachedPromise.mockReturnValue({
    data: [],
    isLoading: false,
    revalidate: vi.fn(),
  });
  useNoteSections.mockReturnValue({
    dropdown: [],
    sections: [],
  });
});

describe("useDailyNotes", () => {
  it("loads Daily notes with excluded directories in its own cache key", async () => {
    setMockPreferences({ excludedFoldersInWorkspaces: "Templates, Archive" });

    useDailyNotes({
      workspaces,
      requestedWorkspace: "",
      searchText: "",
    });
    const load = useCachedPromise.mock.calls[0][0];

    expect(useCachedPromise.mock.calls[0][1]).toEqual([false, workspaces, '["archive","templates"]']);

    await load(false, workspaces, '["archive","templates"]');

    expect(getDailyNotes).toHaveBeenCalledWith(workspaces, new Set(["archive", "templates"]), { refresh: false });
  });

  it("includes workspaces without Daily notes in the dropdown", () => {
    const result = useDailyNotes({
      workspaces,
      requestedWorkspace: "",
      searchText: "",
    });

    expect(result.dropdown).toEqual(["Alpha", "Empty"]);
    expect(result.hasNotes).toBe(false);
  });

  it("applies a requested workspace even when it has no Daily notes", () => {
    useDailyNotes({
      workspaces,
      requestedWorkspace: "empty",
      searchText: "",
    });

    expect(setSelectedWorkspace).toHaveBeenCalledWith("Empty");
  });

  it("keeps the global empty state tied to indexed Daily notes", () => {
    useNoteSections.mockReturnValue({
      dropdown: ["Alpha"],
      sections: [],
    });

    const result = useDailyNotes({
      workspaces,
      requestedWorkspace: "",
      searchText: "missing",
    });

    expect(result.dropdown).toEqual(["Alpha", "Empty"]);
    expect(result.hasNotes).toBe(true);
  });
});
