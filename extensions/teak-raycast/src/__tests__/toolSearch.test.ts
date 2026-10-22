import { describe, expect, test } from "bun:test";
import type { RaycastFolder } from "../lib/api";
import { findManualFolder } from "../lib/folderLookup";
import { toToolSearch } from "../lib/toolSearch";

const FOLDER_ID = "j57abcdefghij1234567890abcdefghij";
const CARD_ID = "k17abcdefghij1234567890abcdefghij";

describe("Search Teak Cards tool", () => {
  test("turns done and mood into qualifiers on the query", () => {
    const search = toToolSearch(
      { done: "todo", mood: 'moody "brutalist"', query: "poster" },
      10,
    );
    expect(search.query).toBe('poster is:todo mood:"moody \\"brutalist\\""');
  });

  test("looks a folder up by name in the query, or by id as a parameter", () => {
    expect(toToolSearch({ folder: "Reading list" }, 10)).toMatchObject({
      folder: undefined,
      query: 'folder:"Reading list"',
    });
    expect(toToolSearch({ folder: FOLDER_ID }, 10)).toMatchObject({
      folder: FOLDER_ID,
      query: undefined,
    });
  });

  test("shuffles with a fresh seed and leaves other sorts seedless", () => {
    expect(toToolSearch({ sort: "shuffle" }, 5, () => 77)).toMatchObject({
      shuffleSeed: 77,
      sort: "shuffle",
    });
    expect(toToolSearch({ sort: "oldest" }, 5, () => 77).shuffleSeed).toBe(
      undefined,
    );
  });

  test("keeps the API's closest-first order for similar cards", () => {
    expect(toToolSearch({ similarTo: ` ${CARD_ID} ` }, 10)).toMatchObject({
      similarTo: CARD_ID,
      sort: undefined,
    });
  });

  test("asks for archived cards only when told to", () => {
    expect(toToolSearch({ archived: true }, 10).archived).toBe("only");
    expect(toToolSearch({}, 10).archived).toBeUndefined();
  });
});

describe("folder lookup for AI tools", () => {
  const folder = (overrides: Partial<RaycastFolder>): RaycastFolder => ({
    cardCount: 0,
    color: null,
    id: "f1",
    kind: "manual",
    name: "Reading list",
    query: null,
    ...overrides,
  });
  const folders = [
    folder({}),
    folder({ id: "f2", kind: "smart", name: "Moodboard", query: "type:image" }),
  ];

  test("finds a folder by name, ignoring case, or by id", () => {
    expect(findManualFolder(folders, "reading LIST").id).toBe("f1");
    expect(findManualFolder(folders, "f1").name).toBe("Reading list");
  });

  test("refuses a folder that doesn't exist", () => {
    expect(() => findManualFolder(folders, "Inbox")).toThrow(
      'No folder named "Inbox"',
    );
  });

  test("refuses a smart folder, which finds its own cards", () => {
    expect(() => findManualFolder(folders, "Moodboard")).toThrow(
      "smart folder",
    );
  });
});
