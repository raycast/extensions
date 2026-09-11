import { describe, expect, it, vi } from "vitest";
import {
  backfillBlocksWithDocumentNames,
  Block,
  documentize,
  filterDatabasesBySpaceId,
  resolveCreateDocumentSpaceId,
  searchBlocksAcrossDatabases,
} from "./search";
import type { DatabaseWrap } from "./databaseLoader";

const makeBlock = (overrides: Partial<Block> = {}): Block => ({
  id: overrides.id ?? "block-1",
  spaceID: overrides.spaceID ?? "space-1",
  content: overrides.content ?? "Block content",
  type: overrides.type ?? "text",
  entityType: overrides.entityType ?? "block",
  documentID: overrides.documentID ?? "doc-1",
  documentName: overrides.documentName ?? "",
});

const makeDatabaseWrap = (spaceID: string, values: unknown[][]): DatabaseWrap => {
  return {
    spaceID,
    database: {
      exec: vi.fn(() => [{ values }]),
      close: vi.fn(),
    } as never,
  };
};

describe("search helpers", () => {
  it("filters databases by selected space before querying", () => {
    const space1Database = makeDatabaseWrap("space-1", [["doc-1", "Doc 1", "document", "document", "doc-1"]]);
    const space2Database = makeDatabaseWrap("space-2", [["doc-2", "Doc 2", "document", "document", "doc-2"]]);

    const filteredDatabases = filterDatabasesBySpaceId([space1Database, space2Database], "space-2");

    searchBlocksAcrossDatabases(filteredDatabases, "doc");

    expect(space1Database.database.exec).not.toHaveBeenCalled();
    expect(space2Database.database.exec).toHaveBeenCalled();
  });

  it("creates documents in the selected space when one is active", () => {
    expect(resolveCreateDocumentSpaceId({ selectedSpaceId: "space-2", primarySpaceId: "space-1" })).toBe("space-2");
    expect(resolveCreateDocumentSpaceId({ selectedSpaceId: "all", primarySpaceId: "space-1" })).toBe("space-1");
    expect(resolveCreateDocumentSpaceId({ selectedSpaceId: "", primarySpaceId: "space-1" })).toBe("space-1");
  });

  it("backfills document names without mutating query logic", () => {
    const database = {
      exec: vi.fn(() => [
        {
          values: [
            ["doc-1", "Document One"],
            ["doc-2", "Document Two"],
          ],
        },
      ]),
    } as never;
    const blocks = [
      makeBlock({ id: "block-1", documentID: "doc-1" }),
      makeBlock({ id: "block-2", documentID: "doc-2" }),
    ];

    expect(backfillBlocksWithDocumentNames(database, blocks)).toEqual([
      makeBlock({ id: "block-1", documentID: "doc-1", documentName: "Document One" }),
      makeBlock({ id: "block-2", documentID: "doc-2", documentName: "Document Two" }),
    ]);
  });

  it("groups document search results by document id", () => {
    const database = {
      exec: vi.fn(() => [
        {
          values: [
            ["doc-1", "Document One", "document", "document", "doc-1"],
            ["block-1", "First block", "text", "block", "doc-1"],
            ["block-2", "Second block", "text", "block", "doc-1"],
            ["doc-2", "Document Two", "document", "document", "doc-2"],
          ],
        },
      ]),
    } as never;

    const documents = documentize(database, "space-1", [
      makeBlock({ documentID: "doc-1" }),
      makeBlock({ documentID: "doc-2" }),
    ]);

    expect(documents).toHaveLength(2);
    expect(documents[0]).toEqual({
      block: makeBlock({
        id: "doc-1",
        content: "Document One",
        type: "document",
        entityType: "document",
        documentID: "doc-1",
      }),
      blocks: [
        makeBlock({ id: "block-1", content: "First block", documentID: "doc-1" }),
        makeBlock({ id: "block-2", content: "Second block", documentID: "doc-1" }),
      ],
    });
    expect(documents[1]).toEqual({
      block: makeBlock({
        id: "doc-2",
        content: "Document Two",
        type: "document",
        entityType: "document",
        documentID: "doc-2",
      }),
      blocks: [],
    });
  });
});
