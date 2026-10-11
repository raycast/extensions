import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { DownloadSession } from "../src/lib/download-session";
import {
  HistoryEntry,
  addEntry,
  clearHistory,
  entryFromSnapshot,
  groupByDay,
  loadHistory,
  matchesFilter,
  parseDeletions,
  parseHistory,
  recordDownload,
  removeFromHistory,
  wasDeleted,
} from "../src/lib/history";

function entry(id: string, patch: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id,
    url: `https://example.com/${id}`,
    kind: "video",
    status: "done",
    folder: "/out",
    startedAt: 0,
    finishedAt: 0,
    ...patch,
  };
}

describe("entryFromSnapshot", () => {
  it("captures a finished download with its metadata and size", () => {
    const session = new DownloadSession(
      {
        kind: "video",
        url: "https://youtu.be/x",
        folder: "/out",
        title: "Clip",
        format: "1080p · MP4",
        meta: { uploader: "Chan", thumbnail: "https://i.ytimg.com/x.jpg", duration: 90, source: "Youtube" },
      },
      1000,
    );
    session.ytdlp({ type: "progress", progress: { downloadedBytes: 10, totalBytes: 10 } }, 1500);
    session.succeed({ filePath: "/out/Clip.mp4" }, 5000);
    expect(entryFromSnapshot(session.getSnapshot(), "id-1")).toEqual({
      id: "id-1",
      url: "https://youtu.be/x",
      kind: "video",
      status: "done",
      title: "Clip",
      uploader: "Chan",
      thumbnail: "https://i.ytimg.com/x.jpg",
      source: "Youtube",
      duration: 90,
      format: "1080p · MP4",
      folder: "/out",
      filePath: "/out/Clip.mp4",
      bytes: 10,
      items: undefined,
      error: undefined,
      startedAt: 1000,
      finishedAt: 5000,
    });
  });

  it("keeps the error of a failed download and skips cancelled ones", () => {
    const failed = new DownloadSession({ kind: "gallery", url: "u", folder: "/out" }, 0);
    failed.count(2, 10);
    failed.fail({ title: "Login Required", message: "Sign in first" }, 20);
    expect(entryFromSnapshot(failed.getSnapshot(), "f")).toMatchObject({
      status: "failed",
      error: "Sign in first",
      items: 2,
    });

    const cancelled = new DownloadSession({ kind: "video", url: "u", folder: "/out" }, 0);
    cancelled.fail({ cancelled: true }, 20);
    expect(entryFromSnapshot(cancelled.getSnapshot())).toBeUndefined();
  });
});

describe("list helpers", () => {
  it("adds newest first, replaces duplicates and caps the length", () => {
    let list: HistoryEntry[] = [];
    for (let i = 0; i < 5; i++) list = addEntry(list, entry(String(i)), 3);
    expect(list.map((e) => e.id)).toEqual(["4", "3", "2"]);
    list = addEntry(list, entry("3", { title: "again" }), 3);
    expect(list.map((e) => e.id)).toEqual(["3", "4", "2"]);
  });

  it("ignores malformed storage", () => {
    expect(parseHistory(undefined)).toEqual([]);
    expect(parseHistory("{not json")).toEqual([]);
    expect(
      parseHistory(JSON.stringify([entry("ok"), { id: 1 }, null, entry("bad", { kind: "nope" as never })])),
    ).toEqual([entry("ok")]);
  });

  it("filters by type and status", () => {
    expect(matchesFilter(entry("a", { kind: "thumbnail" }), "images")).toBe(true);
    expect(matchesFilter(entry("a", { kind: "gallery" }), "images")).toBe(true);
    expect(matchesFilter(entry("a", { kind: "audio" }), "video")).toBe(false);
    expect(matchesFilter(entry("a", { status: "failed" }), "failed")).toBe(true);
    expect(matchesFilter(entry("a"), "all")).toBe(true);
  });

  it("groups by day with Today and Yesterday first", () => {
    const now = new Date(2026, 8, 29, 15, 0).getTime();
    const groups = groupByDay(
      [
        entry("old", { finishedAt: new Date(2026, 8, 20, 9).getTime() }),
        entry("today", { finishedAt: new Date(2026, 8, 29, 8).getTime() }),
        entry("yday", { finishedAt: new Date(2026, 8, 28, 23).getTime() }),
      ],
      now,
    );
    expect(groups.map((g) => g.title).slice(0, 2)).toEqual(["Today", "Yesterday"]);
    expect(groups.map((g) => g.entries[0].id)).toEqual(["today", "yday", "old"]);
  });
});

describe("deletions", () => {
  it("parses stored deletions and tolerates garbage", () => {
    expect(parseDeletions('{"clearedAt":5,"removed":["a",1,"b"]}')).toEqual({ clearedAt: 5, removed: ["a", "b"] });
    expect(parseDeletions(undefined)).toEqual({ clearedAt: 0, removed: [] });
    expect(parseDeletions("nope")).toEqual({ clearedAt: 0, removed: [] });
  });

  it("counts removed entries and anything recorded before the last clear", () => {
    const d = { clearedAt: 100, removed: ["x"] };
    expect(wasDeleted(d, "x", 500)).toBe(true);
    expect(wasDeleted(d, "y", 50)).toBe(true);
    expect(wasDeleted(d, "y", 500)).toBe(false);
    // Recorded in the clear's own millisecond: only the clear's list of IDs can tell.
    expect(wasDeleted(d, "y", 100)).toBe(false);
  });
});

describe("storage", () => {
  beforeEach(() => LocalStorage.clear());

  it("records, removes and clears", async () => {
    await Promise.all([recordDownload(entry("a", { finishedAt: 1 })), recordDownload(entry("b", { finishedAt: 2 }))]);
    expect((await loadHistory()).map((e) => e.id).sort()).toEqual(["a", "b"]);
    await removeFromHistory("a");
    expect((await loadHistory()).map((e) => e.id)).toEqual(["b"]);
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });

  // Another command (Fast Download, the AI tool) has its own write queue, so
  // its write can land right after ours with a list read before it.
  const staleWrite = (ids: string[]) =>
    LocalStorage.setItem("download-history-v1", JSON.stringify(ids.map((id) => entry(id))));

  const ids = async () => (await loadHistory()).map((e) => e.id).sort();

  it("re-records a download that another command's concurrent write dropped", async () => {
    const recording = recordDownload(entry("mine"));
    await vi.waitFor(async () => expect(await ids()).toContain("mine"));
    await staleWrite(["theirs"]);
    await recording; // waits for the check, which re-applies the entry
    expect(await ids()).toEqual(["mine", "theirs"]);
  });

  it("re-removes an entry that another command's concurrent write brought back", async () => {
    await recordDownload(entry("a"));
    await removeFromHistory("a");
    await staleWrite(["a"]);
    await vi.waitFor(async () => expect(await ids()).toEqual([]), { timeout: 2000 });
  });

  // The History command's Remove / Clear History landing while a download's
  // write is still being checked must stay done.
  it("keeps a download cleared while its write is still being checked", async () => {
    const recording = recordDownload(entry("fresh"));
    await vi.waitFor(async () => expect(await ids()).toContain("fresh"));
    await clearHistory();
    await recording;
    expect(await ids()).toEqual([]);
  });

  it("keeps a download removed while its write is still being checked", async () => {
    const recording = recordDownload(entry("fresh"));
    await vi.waitFor(async () => expect(await ids()).toContain("fresh"));
    await removeFromHistory("fresh");
    await recording;
    expect(await ids()).toEqual([]);
  });

  describe("in the same millisecond as Clear History", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000);
    });
    afterEach(() => vi.useRealTimers());

    it("still re-records a download made right after the clear", async () => {
      await clearHistory();
      const recording = recordDownload(entry("later"));
      await vi.waitFor(async () => expect(await ids()).toContain("later"));
      await staleWrite(["theirs"]);
      await recording;
      expect(await ids()).toEqual(["later", "theirs"]);
    });

    it("keeps a download cleared that was recorded just before", async () => {
      const recording = recordDownload(entry("fresh"));
      await vi.waitFor(async () => expect(await ids()).toContain("fresh"));
      await clearHistory();
      await recording;
      expect(await ids()).toEqual([]);
    });
  });

  it("still re-records a download made after the history was cleared", async () => {
    await clearHistory();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const recording = recordDownload(entry("later"));
    await vi.waitFor(async () => expect(await ids()).toContain("later"));
    await staleWrite(["theirs"]);
    await recording;
    expect(await ids()).toEqual(["later", "theirs"]);
  });

  // A deletion only happens once its marker is saved: without the marker, a
  // download's pending check couldn't tell the removal from a lost write and
  // would bring the entry back.
  const failDeletionMarker = () => {
    const real = LocalStorage.setItem.bind(LocalStorage);
    return vi.spyOn(LocalStorage, "setItem").mockImplementation(async (key: string, value: string) => {
      if (key === "download-history-deletions-v1") throw new Error("disk full");
      return real(key, value);
    });
  };

  it("keeps an entry, and fails the removal, when its deletion can't be saved", async () => {
    await recordDownload(entry("a"));
    const spy = failDeletionMarker();
    try {
      await expect(removeFromHistory("a")).rejects.toThrow(/disk full/);
      expect(await ids()).toEqual(["a"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps the history, and fails the clear, when it can't be saved", async () => {
    await recordDownload(entry("a"));
    const spy = failDeletionMarker();
    try {
      await expect(clearHistory()).rejects.toThrow(/disk full/);
      expect(await ids()).toEqual(["a"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps working after a deletion couldn't be saved", async () => {
    await recordDownload(entry("a"));
    const spy = failDeletionMarker();
    await removeFromHistory("a").catch(() => undefined);
    spy.mockRestore();
    await recordDownload(entry("b"));
    await removeFromHistory("a");
    expect(await ids()).toEqual(["b"]);
  });

  it("ignores an undefined entry", async () => {
    await recordDownload(undefined);
    expect(await loadHistory()).toEqual([]);
  });
});
