import { describe, expect, it, vi } from "vitest";
import { buildDailyNoteDateQuery, buildDailyNoteOpenUrl, findDailyNoteBlockId } from "./dailyNotes";
import type { DatabaseWrap } from "./databaseLoader";

const makeDatabaseWrap = (spaceID: string, values: unknown[][]): DatabaseWrap => {
  return {
    spaceID,
    database: {
      exec: vi.fn(() => [{ values }]),
      close: vi.fn(),
    } as never,
  };
};

describe("Daily Note helpers", () => {
  it("builds a stable Daily Note date query", () => {
    expect(buildDailyNoteDateQuery(new Date("2026-03-30T10:00:00.000Z"))).toBe("2026-03-30");
  });

  it("builds the Craft open url", () => {
    expect(buildDailyNoteOpenUrl("today", "space-1")).toBe("craftdocs://openByQuery?query=today&spaceId=space-1");
  });

  it("looks up the Daily Note only in the selected space", () => {
    const space1Database = makeDatabaseWrap("space-1", [["doc-1", "Ignored", "document", "document", "doc-1"]]);
    const space2Database = makeDatabaseWrap("space-2", [["doc-2", "Today", "document", "document", "doc-2"]]);

    const blockId = findDailyNoteBlockId([space1Database, space2Database], "space-2", new Date("2026-03-30"));

    expect(blockId).toBe("doc-2");
    expect(space1Database.database.exec).not.toHaveBeenCalled();
    expect(space2Database.database.exec).toHaveBeenCalledOnce();
  });

  it("returns null when the selected space has no local search database", () => {
    expect(findDailyNoteBlockId([], "space-1", new Date("2026-03-30"))).toBeNull();
  });
});
