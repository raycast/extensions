import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { noteSearchKey, type ContentMatch } from "@commands/search-notes/lib/note-search";
import { ALL_WORKSPACES, type IndexedNote } from "@type/notes";
import type { Workspace } from "@type/octarine";
import { setMockPreferences } from "../../../__mocks__/@raycast/api";

const { getNotes, useCachedPromise } = vi.hoisted(() => ({
  getNotes: vi.fn(),
  useCachedPromise: vi.fn(),
}));

vi.mock("@raycast/utils", () => ({ useCachedPromise }));
vi.mock("@lib/notes", () => ({ getNotes }));
vi.mock("react", () => ({ useMemo: (factory: () => unknown) => factory() }));

import { useNotes } from "@commands/search-notes/hooks/use-notes";

const alpha = { name: "Alpha", path: "/tmp/alpha" };
const beta = { name: "Beta", path: "/tmp/beta" };

function note(workspace: Workspace, title: string, options?: { pinned?: boolean }): IndexedNote {
  const notePath = `${title.toLowerCase().replace(/\s+/g, "-")}.md`;

  return {
    id: path.resolve(workspace.path, notePath),
    title,
    path: notePath,
    folder: { name: "", path: "", workspace },
    pinned: options?.pinned ?? false,
    searchText: `${title} ${workspace.name}`.toLowerCase(),
  };
}

function renderNotes(notes: IndexedNote[], options?: Partial<Parameters<typeof useNotes>[0]>) {
  useCachedPromise.mockReturnValue({
    data: notes,
    isLoading: false,
    revalidate: vi.fn(),
  });

  return useNotes({
    workspaces: [alpha, beta],
    searchText: "",
    selectedWorkspace: ALL_WORKSPACES,
    ...options,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getNotes.mockResolvedValue([]);
});

describe("useNotes", () => {
  it("loads general notes with excluded directories in its cache key", async () => {
    setMockPreferences({ excludedFoldersInWorkspaces: "Templates, Archive" });

    renderNotes([]);
    const load = useCachedPromise.mock.calls[0][0];

    expect(useCachedPromise.mock.calls[0][1]).toEqual([false, [alpha, beta], '["archive","templates"]']);

    await load(false, [alpha, beta], '["archive","templates"]');

    expect(getNotes).toHaveBeenCalledWith([alpha, beta], new Set(["archive", "templates"]), { refresh: false });
  });

  it("groups notes by workspace and sorts sections by name", () => {
    const result = renderNotes([note(beta, "Beta note"), note(alpha, "Alpha note")]);

    expect(result.sections.map((section) => section.name)).toEqual(["Alpha", "Beta"]);
    expect(result.sections[0].notes.map((item) => item.title)).toEqual(["Alpha note"]);
  });

  it("keeps same-named workspaces as separate dropdown filters", () => {
    const duplicate: Workspace = { name: "Alpha", path: "/tmp/alpha-2", display: "Alpha (2)" };
    const result = renderNotes([note(alpha, "Alpha note"), note(duplicate, "Other")], {
      workspaces: [alpha, duplicate],
      selectedWorkspace: duplicate.path,
    });

    expect(result.dropdown).toEqual([alpha, duplicate]);
    expect(result.sections[0].name).toBe("Alpha (2)");
    expect(result.sections.flatMap((section) => section.notes.map((item) => item.title))).toEqual(["Other"]);
  });

  it("filters by workspace and drops empty sections", () => {
    const result = renderNotes([note(alpha, "Alpha note"), note(beta, "Beta note")], {
      selectedWorkspace: beta.path,
    });

    expect(result.sections.map((section) => section.name)).toEqual(["Beta"]);
  });

  it("keeps every workspace when all workspaces are selected", () => {
    const result = renderNotes([note(alpha, "Alpha note"), note(beta, "Beta note")]);

    expect(result.sections.map((section) => section.name)).toEqual(["Alpha", "Beta"]);
  });

  it("applies the note filter and matcher", () => {
    const notes = [
      note(alpha, "Alpha regular"),
      note(alpha, "Alpha pinned", { pinned: true }),
      note(beta, "Beta regular"),
    ];
    const pinned = renderNotes(notes, { filter: (item) => item.pinned });
    const matched = renderNotes(notes, { searchText: "beta" });

    expect(pinned.sections.flatMap((section) => section.notes.map((item) => item.title))).toEqual(["Alpha pinned"]);
    expect(matched.sections.map((section) => section.name)).toEqual(["Beta"]);
  });

  it("includes content matches and keeps metadata matches first", () => {
    const contentNote = note(alpha, "Alpha content");
    const titleNote = note(alpha, "Needle title");
    const contentMatches = new Map<string, ContentMatch>([
      [noteSearchKey(alpha.path, contentNote.path), { excerpt: "…needle in the content…" }],
    ]);
    const result = renderNotes([contentNote, titleNote], { searchText: "needle", contentMatches });

    expect(result.sections[0].notes.map((item) => item.title)).toEqual(["Needle title", "Alpha content"]);
  });

  it("matches content by workspace path and note path", () => {
    const alphaNote = note(alpha, "Shared");
    const betaNote = note(beta, "Shared");
    const contentMatches = new Map<string, ContentMatch>([
      [noteSearchKey(alpha.path, alphaNote.path), { excerpt: "…workspace-specific match…" }],
    ]);
    const result = renderNotes([alphaNote, betaNote], { searchText: "needle", contentMatches });

    expect(result.sections.map((section) => section.name)).toEqual(["Alpha"]);
  });

  it("applies workspace and pinned filters to content matches", () => {
    const alphaPinned = note(alpha, "Alpha pinned", { pinned: true });
    const alphaRegular = note(alpha, "Alpha regular");
    const betaPinned = note(beta, "Beta pinned", { pinned: true });
    const contentMatches = new Map<string, ContentMatch>();
    for (const item of [alphaPinned, alphaRegular, betaPinned]) {
      contentMatches.set(noteSearchKey(item.folder.workspace.path, item.path), { excerpt: "…needle…" });
    }
    const result = renderNotes([alphaPinned, alphaRegular, betaPinned], {
      filter: (item) => item.pinned,
      searchText: "needle",
      contentMatches,
      selectedWorkspace: alpha.path,
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].notes.map((item) => item.title)).toEqual(["Alpha pinned"]);
  });

  it("sorts pinned notes first only when requested", () => {
    const notes = [note(alpha, "Alpha regular"), note(alpha, "Alpha pinned", { pinned: true })];
    const sorted = renderNotes(notes, { selectedWorkspace: alpha.path, showPinnedNotesFirst: true });
    const unsorted = renderNotes(notes, { selectedWorkspace: alpha.path });

    expect(sorted.sections[0].notes.map((item) => item.title)).toEqual(["Alpha pinned", "Alpha regular"]);
    expect(unsorted.sections[0].notes.map((item) => item.title)).toEqual(["Alpha regular", "Alpha pinned"]);
  });
});
