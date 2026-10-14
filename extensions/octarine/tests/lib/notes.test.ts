import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTempDir, removeDir, writeTextFile } from "../helpers/fs";
import { getDailyNotes, getNotes, scanDailyNotes, scanNotes } from "@lib/notes";

let tempDir: string | undefined;

afterEach(async () => {
  vi.restoreAllMocks();

  if (tempDir) {
    await removeDir(tempDir);
    tempDir = undefined;
  }
});

describe("notes", () => {
  it("scans markdown files and builds indexed note fields", async () => {
    tempDir = await createTempDir("octarine-notes");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "root.md"), "# Root");
    await writeTextFile(path.join(workspace.path, "docs", "Guide.md"), "---\npinned: true\n---\n# Guide");
    await writeTextFile(path.join(workspace.path, ".octarine", "hidden.md"), "# Hidden");
    await writeTextFile(path.join(workspace.path, ".templates", "template.md"), "# Template");
    await writeTextFile(path.join(workspace.path, "Archive", "ignored.md"), "# Ignored");
    await writeTextFile(path.join(workspace.path, "docs", "image.png"), "png");

    const notes = await scanNotes([workspace], new Set(["archive"]));
    const notesByPath = notes.slice().sort((a, b) => a.path.localeCompare(b.path));

    expect(notesByPath).toHaveLength(2);
    expect(notesByPath).toEqual([
      expect.objectContaining({
        id: path.resolve(workspace.path, "docs/Guide.md"),
        title: "Guide",
        path: "docs/Guide.md",
        pinned: true,
        searchText: "guide docs/guide.md work",
        folder: expect.objectContaining({
          name: "docs",
          path: "docs",
          workspace,
        }),
      }),
      expect.objectContaining({
        id: path.resolve(workspace.path, "root.md"),
        title: "root",
        path: "root.md",
        pinned: false,
        searchText: "root root.md work",
        folder: expect.objectContaining({
          name: "",
          path: "",
          workspace,
        }),
      }),
    ]);
  });

  it("keeps notes from workspaces with the same name", async () => {
    tempDir = await createTempDir("octarine-notes-duplicate-workspace-name");

    const firstWorkspace = {
      name: "Work",
      path: path.join(tempDir, "first", "Work"),
    };
    const secondWorkspace = {
      name: "Work",
      path: path.join(tempDir, "second", "Work"),
    };

    await writeTextFile(path.join(firstWorkspace.path, "todo.md"), "# First workspace");
    await writeTextFile(path.join(secondWorkspace.path, "todo.md"), "# Second workspace");

    const notes = await scanNotes([firstWorkspace, secondWorkspace], new Set());

    expect(notes).toHaveLength(2);
    expect(notes.map((note) => note.id).toSorted()).toEqual(
      [path.resolve(firstWorkspace.path, "todo.md"), path.resolve(secondWorkspace.path, "todo.md")].toSorted(),
    );
  });

  it("keeps an indented block-scalar delimiter inside frontmatter while detecting pinned", async () => {
    tempDir = await createTempDir("octarine-notes-frontmatter-block-scalar");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };
    await writeTextFile(
      path.join(workspace.path, "Note.md"),
      "---\ndescription: |\n  ---\n  keep\npinned: true\n---\n# Body",
    );

    const [note] = await scanNotes([workspace], new Set());

    expect(note.pinned).toBe(true);
  });

  it("loads all notes and reuses the notes cache", async () => {
    tempDir = await createTempDir("octarine-notes-cache");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "Pinned.md"), "---\npinned: true\n---\ncontent");
    await writeTextFile(path.join(workspace.path, "Regular.md"), "---\npinned: false\n---\ncontent");

    const firstResult = await getNotes([workspace], new Set());

    expect(firstResult.map((note) => [note.path, note.pinned])).toEqual([
      ["Pinned.md", true],
      ["Regular.md", false],
    ]);
    await writeTextFile(path.join(workspace.path, "Regular.md"), "---\npinned: true\n---\ncontent");

    const secondResult = await getNotes([workspace], new Set());

    expect(secondResult.map((note) => [note.path, note.pinned])).toEqual([
      ["Pinned.md", true],
      ["Regular.md", false],
    ]);
  });

  it("rescans notes when refresh is requested", async () => {
    tempDir = await createTempDir("octarine-notes-refresh");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "Pinned.md"), "---\npinned: true\n---\ncontent");
    await writeTextFile(path.join(workspace.path, "Regular.md"), "---\npinned: false\n---\ncontent");

    expect((await getNotes([workspace], new Set())).map((note) => [note.path, note.pinned])).toEqual([
      ["Pinned.md", true],
      ["Regular.md", false],
    ]);

    await writeTextFile(path.join(workspace.path, "Regular.md"), "---\npinned: true\n---\ncontent");

    const refreshed = await getNotes([workspace], new Set(), { refresh: true });

    expect(refreshed.map((note) => [note.path, note.pinned])).toEqual([
      ["Pinned.md", true],
      ["Regular.md", true],
    ]);
  });

  it("rescans when excluded directories change", async () => {
    tempDir = await createTempDir("octarine-notes-excluded-dirs");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "Pinned.md"), "---\npinned: true\n---\ncontent");
    await writeTextFile(path.join(workspace.path, "Archive", "Hidden.md"), "---\npinned: true\n---\ncontent");

    expect((await getNotes([workspace], new Set(["archive"]))).map((note) => note.path)).toEqual(["Pinned.md"]);

    const rescanned = await getNotes([workspace], new Set());

    expect(rescanned.map((note) => note.path)).toEqual(["Archive/Hidden.md", "Pinned.md"]);
  });

  it("rescans when the workspace set changes", async () => {
    tempDir = await createTempDir("octarine-notes-workspace-change");

    const work = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };
    const personal = {
      name: "Personal",
      path: path.join(tempDir, "Personal"),
    };

    await writeTextFile(path.join(work.path, "Pinned.md"), "---\npinned: true\n---\ncontent");
    await writeTextFile(path.join(personal.path, "Side.md"), "---\npinned: true\n---\ncontent");

    expect((await getNotes([work], new Set())).map((note) => note.id)).toEqual([path.resolve(work.path, "Pinned.md")]);

    const rescanned = await getNotes([work, personal], new Set());

    expect(rescanned.map((note) => note.id)).toEqual([
      path.resolve(personal.path, "Side.md"),
      path.resolve(work.path, "Pinned.md"),
    ]);
  });

  it("fails when note scanning hits an unreadable workspace", async () => {
    tempDir = await createTempDir("octarine-notes-scan-error");

    const missing = {
      name: "Missing",
      path: path.join(tempDir, "Missing"),
    };
    const laterMissing = {
      name: "LaterMissing",
      path: path.join(tempDir, "LaterMissing"),
    };

    await expect(scanNotes([missing, laterMissing], new Set())).rejects.toThrow(/Failed to read directory .+/);
  });
});

describe("daily notes", () => {
  it("scans only the Daily directory and builds natural language titles", async () => {
    tempDir = await createTempDir("octarine-daily-notes");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "Daily", "2023-02-18.md"), "# Note");
    await writeTextFile(path.join(workspace.path, "Daily", "2026-W03.md"), "# Week");
    await writeTextFile(path.join(workspace.path, "Daily", "project.md"), "# Not a daily note");
    await writeTextFile(path.join(workspace.path, "Daily", "archive", "2024-01-05.md"), "# Nested");
    await writeTextFile(path.join(workspace.path, "Notes", "2022-01-01.md"), "# Outside Daily");

    const notes = await scanDailyNotes([workspace], new Set());

    expect(notes.map((note) => [note.path, note.title])).toEqual([
      ["Daily/2026-W03.md", "Week 3, 2026"],
      ["Daily/archive/2024-01-05.md", "January 5, 2024"],
      ["Daily/2023-02-18.md", "February 18, 2023"],
    ]);
    expect(notes[0].searchText).toContain("2026-w03");
    expect(notes[2].searchText).toContain("february 18, 2023");
    expect(notes[2].folder).toEqual(expect.objectContaining({ name: "Daily", path: "Daily", workspace }));
    expect(notes[2].pinned).toBe(false);
  });

  it("returns no notes when a workspace has no Daily directory", async () => {
    tempDir = await createTempDir("octarine-daily-missing");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "Regular.md"), "# Regular");

    expect(await scanDailyNotes([workspace], new Set())).toEqual([]);
  });

  it("keeps daily notes from workspaces with the same name", async () => {
    tempDir = await createTempDir("octarine-daily-duplicate-workspace-name");

    const firstWorkspace = {
      name: "Work",
      path: path.join(tempDir, "first", "Work"),
    };
    const secondWorkspace = {
      name: "Work",
      path: path.join(tempDir, "second", "Work"),
    };

    await writeTextFile(path.join(firstWorkspace.path, "Daily", "2026-09-24.md"), "# First workspace");
    await writeTextFile(path.join(secondWorkspace.path, "Daily", "2026-09-24.md"), "# Second workspace");

    const notes = await scanDailyNotes([firstWorkspace, secondWorkspace], new Set());

    expect(notes).toHaveLength(2);
    expect(notes.map((note) => note.id).toSorted()).toEqual(
      [
        path.resolve(firstWorkspace.path, "Daily/2026-09-24.md"),
        path.resolve(secondWorkspace.path, "Daily/2026-09-24.md"),
      ].toSorted(),
    );
  });

  it("loads daily notes and reuses the daily notes cache", async () => {
    tempDir = await createTempDir("octarine-daily-notes-cache");

    const workspace = {
      name: "Work",
      path: path.join(tempDir, "Work"),
    };

    await writeTextFile(path.join(workspace.path, "Daily", "2026-03-26.md"), "# Note");

    const first = await getDailyNotes([workspace], new Set());
    expect(first.map((note) => note.path)).toEqual(["Daily/2026-03-26.md"]);

    await writeTextFile(path.join(workspace.path, "Daily", "2026-03-27.md"), "# Another");

    const cached = await getDailyNotes([workspace], new Set());
    expect(cached.map((note) => note.path)).toEqual(["Daily/2026-03-26.md"]);

    const refreshed = await getDailyNotes([workspace], new Set(), { refresh: true });
    expect(refreshed.map((note) => note.path)).toEqual(["Daily/2026-03-27.md", "Daily/2026-03-26.md"]);
  });
});
