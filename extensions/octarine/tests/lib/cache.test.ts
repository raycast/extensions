import { Cache } from "@raycast/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentsCache, DailyNotesCache, NotesCache, WorkspacesCache } from "@lib/cache";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("invalidates cached notes, Daily Desk notes, and attachments when a workspace name changes", () => {
  const original = [{ name: "Old", path: "/workspaces/old" }];
  const renamed = [{ name: "New", path: "/workspaces/old" }];
  const excluded = new Set<string>();

  NotesCache.write([], original, excluded);
  DailyNotesCache.write([], original, excluded);
  AttachmentsCache.write([], original, excluded, excluded);

  expect(NotesCache.read(renamed, excluded)).toBeUndefined();
  expect(DailyNotesCache.read(renamed, excluded)).toBeUndefined();
  expect(AttachmentsCache.read(renamed, excluded, excluded)).toBeUndefined();
});

describe("workspace cache", () => {
  const staleOffsetMs = 24 * 60 * 60 * 1000;
  const roots = ["/workspaces"];
  const excludedDirectories = new Set<string>();

  it("returns undefined when the key is missing", () => {
    const result = WorkspacesCache.read(roots, excludedDirectories);

    expect(result).toBeUndefined();
  });

  it("returns cached workspaces when the cached value is valid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T10:00:00.000Z"));

    const cached = {
      workspaces: [
        { name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false },
        { name: "Beta", path: "/workspaces/beta", ignored: false, invalid: true },
      ],
    };

    WorkspacesCache.write(cached.workspaces, roots, excludedDirectories);

    const result = WorkspacesCache.read(roots, excludedDirectories);

    expect(result).toEqual(cached.workspaces);
  });

  it("returns undefined when the cached value is stale", () => {
    const now = new Date("2026-03-31T10:00:00.000Z").valueOf();
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(now);

    WorkspacesCache.write([{ name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false }], roots, excludedDirectories);
    nowSpy.mockReturnValue(now + staleOffsetMs);

    expect(WorkspacesCache.read(roots, excludedDirectories)).toBeUndefined();
  });

  it("returns undefined when the cached value is malformed", () => {
    vi.spyOn(Cache.prototype, "get").mockReturnValue("{");

    const result = WorkspacesCache.read(roots, excludedDirectories);

    expect(result).toBeUndefined();
  });

  it("returns undefined when the cached value is not a valid workspace payload", () => {
    vi.spyOn(Cache.prototype, "get").mockReturnValue(
      JSON.stringify({ cachedAt: Date.now(), data: [{ name: "Alpha", path: 1, ignored: false, invalid: false }] }),
    );

    const result = WorkspacesCache.read(roots, excludedDirectories);

    expect(result).toBeUndefined();
  });

  it("stores workspaces under a roots-specific cache key", () => {
    WorkspacesCache.write([{ name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false }], roots, excludedDirectories);

    expect(WorkspacesCache.read(roots, excludedDirectories)).toEqual([
      { name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false },
    ]);
  });

  it("keeps caches for different workspace roots separate", () => {
    WorkspacesCache.write(
      [{ name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false }],
      ["/workspaces-a"],
      excludedDirectories,
    );
    WorkspacesCache.write(
      [{ name: "Beta", path: "/workspaces/beta", ignored: true, invalid: false }],
      ["/workspaces-b"],
      excludedDirectories,
    );

    expect(WorkspacesCache.read(["/workspaces-a"], excludedDirectories)).toEqual([
      { name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false },
    ]);
    expect(WorkspacesCache.read(["/workspaces-b"], excludedDirectories)).toEqual([
      { name: "Beta", path: "/workspaces/beta", ignored: true, invalid: false },
    ]);
  });

  it("treats the same workspace roots in different orders as the same cache entry", () => {
    WorkspacesCache.write(
      [{ name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false }],
      ["/workspaces-b", "/workspaces-a"],
      excludedDirectories,
    );

    expect(WorkspacesCache.read(["/workspaces-a", "/workspaces-b"], excludedDirectories)).toEqual([
      { name: "Alpha", path: "/workspaces/alpha", ignored: false, invalid: false },
    ]);
  });
});

describe("notes cache", () => {
  const staleOffsetMs = 24 * 60 * 60 * 1000;
  const workspaces = [{ name: "Alpha", path: "/workspaces/alpha" }];
  const notes = [
    {
      id: "Alpha::Pinned.md",
      title: "Pinned",
      path: "Pinned.md",
      folder: {
        name: "",
        path: "",
        workspace: workspaces[0],
      },
      pinned: true,
      searchText: "pinned pinned.md alpha",
    },
  ];

  it("returns cached notes when the cached value is valid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T10:00:00.000Z"));

    NotesCache.write(notes, workspaces, new Set(["archive"]));

    expect(NotesCache.read(workspaces, new Set(["archive"]))).toEqual(notes);
  });

  it("returns cached empty notes arrays", () => {
    NotesCache.write([], workspaces, new Set());

    expect(NotesCache.read(workspaces, new Set())).toEqual([]);
  });

  it("returns undefined when the notes cache is stale", () => {
    const now = new Date("2026-03-31T10:00:00.000Z").valueOf();
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(now);

    NotesCache.write(notes, workspaces, new Set());
    nowSpy.mockReturnValue(now + staleOffsetMs);

    expect(NotesCache.read(workspaces, new Set())).toBeUndefined();
  });

  it("returns undefined when the notes cache is malformed", () => {
    vi.spyOn(Cache.prototype, "get").mockReturnValue("{");

    expect(NotesCache.read(workspaces, new Set())).toBeUndefined();
  });

  it("returns undefined when the notes cache contains invalid notes", () => {
    vi.spyOn(Cache.prototype, "get").mockReturnValue(
      JSON.stringify({
        cachedAt: Date.now(),
        data: [{ id: "Alpha::Pinned.md", title: "Pinned", path: "Pinned.md", folder: { name: "", path: "", workspace: { name: "Alpha", path: 1 } }, pinned: true, searchText: "pinned" }],
      }),
    );

    expect(NotesCache.read(workspaces, new Set())).toBeUndefined();
  });

  it("keeps caches for different excluded directories separate", () => {
    NotesCache.write(notes, workspaces, new Set(["archive"]));
    NotesCache.write([], workspaces, new Set(["templates"]));

    expect(NotesCache.read(workspaces, new Set(["archive"]))).toEqual(notes);
    expect(NotesCache.read(workspaces, new Set(["templates"]))).toEqual([]);
  });

  it("keeps caches for different workspace sets separate", () => {
    const otherWorkspace = { name: "Beta", path: "/workspaces/beta" };

    NotesCache.write(notes, workspaces, new Set());
    NotesCache.write(
      [
        {
          id: "Beta::Pinned.md",
          title: "Pinned",
          path: "Pinned.md",
          folder: {
            name: "",
            path: "",
            workspace: otherWorkspace,
          },
          pinned: true,
          searchText: "pinned pinned.md beta",
        },
      ],
      [otherWorkspace],
      new Set(),
    );

    expect(NotesCache.read(workspaces, new Set())).toEqual(notes);
    expect(NotesCache.read([otherWorkspace], new Set())).toEqual([
      {
        id: "Beta::Pinned.md",
        title: "Pinned",
        path: "Pinned.md",
        folder: {
          name: "",
          path: "",
          workspace: otherWorkspace,
        },
        pinned: true,
        searchText: "pinned pinned.md beta",
      },
    ]);
  });
});

describe("attachments cache", () => {
  const staleOffsetMs = 24 * 60 * 60 * 1000;
  const workspaces = [{ name: "Alpha", path: "/workspaces/alpha" }];
  const attachments = [
    {
      name: "report.pdf",
      path: "/workspaces/alpha/.attachments/report.pdf",
      extension: "pdf",
      workspace: workspaces[0],
      searchText: "report.pdf alpha pdf",
    },
  ];

  it("returns cached attachments when the cached value is valid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T10:00:00.000Z"));

    AttachmentsCache.write(attachments, workspaces, new Set(["archive"]), new Set(["png"]));

    expect(AttachmentsCache.read(workspaces, new Set(["archive"]), new Set(["png"]))).toEqual(attachments);
  });

  it("returns undefined when the attachments cache is stale", () => {
    const now = new Date("2026-03-31T10:00:00.000Z").valueOf();
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(now);

    AttachmentsCache.write(attachments, workspaces, new Set(), new Set());
    nowSpy.mockReturnValue(now + staleOffsetMs);

    expect(AttachmentsCache.read(workspaces, new Set(), new Set())).toBeUndefined();
  });

  it("returns undefined when the attachments cache is malformed", () => {
    vi.spyOn(Cache.prototype, "get").mockReturnValue("{");

    expect(AttachmentsCache.read(workspaces, new Set(), new Set())).toBeUndefined();
  });

  it("returns undefined when the attachments cache contains invalid attachments", () => {
    vi.spyOn(Cache.prototype, "get").mockReturnValue(
      JSON.stringify({
        cachedAt: Date.now(),
        data: [{ name: "report.pdf", path: "/workspaces/alpha/.attachments/report.pdf", extension: "pdf" }],
      }),
    );

    expect(AttachmentsCache.read(workspaces, new Set(), new Set())).toBeUndefined();
  });

  it("keeps caches for different excluded extensions separate", () => {
    AttachmentsCache.write(attachments, workspaces, new Set(), new Set(["png"]));
    AttachmentsCache.write([], workspaces, new Set(), new Set(["pdf"]));

    expect(AttachmentsCache.read(workspaces, new Set(), new Set(["png"]))).toEqual(attachments);
    expect(AttachmentsCache.read(workspaces, new Set(), new Set(["pdf"]))).toEqual([]);
  });

  it("keeps caches for different excluded directories separate", () => {
    AttachmentsCache.write(attachments, workspaces, new Set(["archive"]), new Set());
    AttachmentsCache.write([], workspaces, new Set(["drafts"]), new Set());

    expect(AttachmentsCache.read(workspaces, new Set(["archive"]), new Set())).toEqual(attachments);
    expect(AttachmentsCache.read(workspaces, new Set(["drafts"]), new Set())).toEqual([]);
  });

  it("keeps caches for different workspace sets separate", () => {
    const otherWorkspace = { name: "Beta", path: "/workspaces/beta" };
    const otherAttachments = [
      {
        name: "diagram.png",
        path: "/workspaces/beta/.attachments/diagram.png",
        extension: "png",
        workspace: otherWorkspace,
        searchText: "diagram.png beta png",
      },
    ];

    AttachmentsCache.write(attachments, workspaces, new Set(), new Set());
    AttachmentsCache.write(otherAttachments, [otherWorkspace], new Set(), new Set());

    expect(AttachmentsCache.read(workspaces, new Set(), new Set())).toEqual(attachments);
    expect(AttachmentsCache.read([otherWorkspace], new Set(), new Set())).toEqual(otherAttachments);
  });
});
