import { describe, expect, test } from "bun:test";
import {
  applyArchivedFilter,
  applyDoneFilter,
  applyHueFilter,
  applySortFilter,
  applyTagFilter,
  applyTrashedFilter,
  applyTypeFilter,
  buildSearchText,
  clearSearchFilters,
  parseSearchFilters,
  toApiQuery,
  toSmartFolderQuery,
} from "../lib/searchFilters";

describe("parseSearchFilters", () => {
  test("ignores impossible dates instead of rolling them over", () => {
    expect(parseSearchFilters("after:2026-02-31").createdAfter).toBeUndefined();
    expect(parseSearchFilters("after:2026-00").createdAfter).toBeUndefined();
    expect(parseSearchFilters("after:2026-02-28").createdAfter).toBe(
      new Date(2026, 1, 28).getTime(),
    );
  });

  test("keeps Newest First where the list otherwise orders by closeness", () => {
    expect(applySortFilter("poster sort:shuffle", "newest")).toBe("poster");
    expect(
      applySortFilter("poster sort:shuffle", "newest", { keepNewest: true }),
    ).toBe("poster sort:newest");
    expect(applyTagFilter("poster sort:newest", "design")).toContain(
      "sort:newest",
    );
  });

  test("parses a simple single-word tag", () => {
    const parsed = parseSearchFilters("tag:design");
    expect(parsed.tag).toBe("design");
    expect(parsed.query).toBe("");
  });

  test("keeps a quoted tag with spaces intact", () => {
    const parsed = parseSearchFilters('tag:"design systems"');
    expect(parsed.tag).toBe("design systems");
    expect(parsed.query).toBe("");
  });

  test("separates a quoted tag from free-text query terms", () => {
    const parsed = parseSearchFilters('hello tag:"design systems" world');
    expect(parsed.tag).toBe("design systems");
    expect(parsed.query).toBe("hello world");
  });

  test("handles escaped quotes inside a quoted value", () => {
    const parsed = parseSearchFilters('tag:"a \\"quoted\\" tag"');
    expect(parsed.tag).toBe('a "quoted" tag');
  });

  test("treats a bare colon value as the tag (legacy unquoted)", () => {
    const parsed = parseSearchFilters("tag:design");
    expect(parsed.tag).toBe("design");
  });
});

describe("buildSearchText", () => {
  test("quotes a tag containing spaces", () => {
    expect(buildSearchText({ tag: "design systems" })).toBe(
      'tag:"design systems"',
    );
  });

  test("leaves a simple tag unquoted", () => {
    expect(buildSearchText({ tag: "design" })).toBe("tag:design");
  });

  test("escapes quotes and backslashes in a tag", () => {
    expect(buildSearchText({ tag: 'a "b" \\c' })).toBe('tag:"a \\"b\\" \\\\c"');
  });
});

describe("filter round-trips", () => {
  test("applyTagFilter round-trips a multi-word tag", () => {
    const next = applyTagFilter("", "design systems");
    expect(next).toBe('tag:"design systems"');
    expect(parseSearchFilters(next).tag).toBe("design systems");
  });

  test("applyTagFilter preserves existing free text and type", () => {
    const next = applyTagFilter("type:link inspiration", "design systems");
    const parsed = parseSearchFilters(next);
    expect(parsed.tag).toBe("design systems");
    expect(parsed.type).toBe("link");
    expect(parsed.query).toBe("inspiration");
  });

  test("applyTypeFilter does not corrupt an existing multi-word tag", () => {
    const withTag = applyTagFilter("", "design systems");
    const next = applyTypeFilter(withTag, "image");
    const parsed = parseSearchFilters(next);
    expect(parsed.tag).toBe("design systems");
    expect(parsed.type).toBe("image");
  });

  test("clearSearchFilters keeps free text and drops the tag", () => {
    const next = clearSearchFilters('hello tag:"design systems"');
    expect(next).toBe("hello");
  });
});

describe("color, Trash, and date filters", () => {
  test("parses trash, hue, style, hex, and dates out of the query", () => {
    const parsed = parseSearchFilters(
      "poster trash hue:Blue style:minimal #112233 after:2026-09 before:2026-10-15",
    );
    expect(parsed).toMatchObject({
      query: "poster",
      trashed: true,
      hue: ["blue"],
      style: ["minimal"],
      hex: ["#112233"],
      createdAfter: new Date(2026, 8, 1).getTime(),
      createdBefore: new Date(2026, 9, 15).getTime(),
      hasExplicitFilters: true,
    });
  });

  test("leaves unknown hues and malformed dates as search words", () => {
    const parsed = parseSearchFilters("hue:plaid after:soon #12");
    expect(parsed.hue).toEqual([]);
    expect(parsed.createdAfter).toBeUndefined();
    expect(parsed.query).toBe("hue:plaid after:soon #12");
  });

  test("round-trips filters through the search text", () => {
    const text = buildSearchText(
      parseSearchFilters("trash hue:teal #abcdef after:2026-01-02"),
    );
    expect(parseSearchFilters(text)).toMatchObject({
      trashed: true,
      hue: ["teal"],
      hex: ["#abcdef"],
      createdAfter: new Date(2026, 0, 2).getTime(),
    });
  });

  test("Show Trash and color filters toggle without losing the query", () => {
    const inTrash = applyTrashedFilter("poster type:image", true);
    expect(parseSearchFilters(inTrash)).toMatchObject({
      query: "poster",
      trashed: true,
      type: "image",
    });
    expect(
      parseSearchFilters(applyTrashedFilter(inTrash)).trashed,
    ).toBeUndefined();
    expect(parseSearchFilters(applyHueFilter("poster", "red")).hue).toEqual([
      "red",
    ]);
  });
});

describe("qualifier filters", () => {
  const CARD_ID = "k17abcdefghij1234567890abcdefghij";

  test("parses is:, like:, mood:, text:, price: and folder: out of the query", () => {
    const parsed = parseSearchFilters(
      `poster is:archived is:DONE is:todo like:${CARD_ID} mood:"moody brutalist" text:"total due" price:<100 price:>=20 folder:"Reading list"`,
    );
    expect(parsed).toMatchObject({
      archived: true,
      done: true,
      folder: "Reading list",
      hasExplicitFilters: true,
      like: CARD_ID,
      mood: "moody brutalist",
      ocrText: ["total due"],
      price: ["<100", ">=20"],
      query: "poster",
      todo: true,
    });
  });

  test("reads is:fav as a favorites filter", () => {
    expect(parseSearchFilters("is:fav").favorited).toBe(true);
  });

  test("takes a Teak link as the card for like:", () => {
    const parsed = parseSearchFilters(
      `like:https://app.teakvault.com/?card=${CARD_ID}`,
    );
    expect(parsed.like).toBe(CARD_ID);
  });

  test("leaves malformed qualifiers as search words", () => {
    const parsed = parseSearchFilters(
      "is:unread like:card_1 price:cheap price:100 mood: folder:",
    );
    expect(parsed).toMatchObject({
      archived: undefined,
      hasExplicitFilters: false,
      like: undefined,
      price: [],
    });
    expect(parsed.query).toBe(
      "is:unread like:card_1 price:cheap price:100 mood: folder:",
    );
  });

  test("round-trips every qualifier through the search text", () => {
    const text = buildSearchText(
      parseSearchFilters(
        `poster is:archived is:done like:${CARD_ID} mood:"moody brutalist" text:"total due" price:<100 folder:"Reading list" sort:shuffle`,
      ),
    );
    expect(parseSearchFilters(text)).toMatchObject({
      archived: true,
      done: true,
      folder: "Reading list",
      like: CARD_ID,
      mood: "moody brutalist",
      ocrText: ["total due"],
      price: ["<100"],
      query: "poster",
      sort: "shuffle",
    });
  });

  test("Archive and Trash are separate views", () => {
    const archive = parseSearchFilters(
      applyArchivedFilter(applyTrashedFilter("poster", true), true),
    );
    expect(archive.archived).toBe(true);
    expect(archive.trashed).toBeUndefined();

    const trash = parseSearchFilters(
      applyTrashedFilter(applyArchivedFilter("poster", true), true),
    );
    expect(trash.trashed).toBe(true);
    expect(trash.archived).toBeUndefined();
  });

  test("Archive and Done filters toggle without losing the query", () => {
    const archived = applyArchivedFilter("poster type:image", true);
    expect(parseSearchFilters(archived)).toMatchObject({
      archived: true,
      query: "poster",
      type: "image",
    });
    expect(
      parseSearchFilters(applyArchivedFilter(archived)).archived,
    ).toBeUndefined();

    const todo = parseSearchFilters(applyDoneFilter("poster", "todo"));
    expect(todo.todo).toBe(true);
    expect(todo.done).toBeUndefined();
    const done = parseSearchFilters(
      applyDoneFilter(applyDoneFilter("poster", "todo"), "done"),
    );
    expect(done.done).toBe(true);
    expect(done.todo).toBeUndefined();
    const cleared = parseSearchFilters(
      applyDoneFilter(applyDoneFilter("poster", "todo")),
    );
    expect(cleared.todo).toBeUndefined();
    expect(cleared.done).toBeUndefined();
    expect(cleared.query).toBe("poster");
  });

  test("Clear Filters drops the qualifiers and keeps the words", () => {
    expect(
      clearSearchFilters(`poster is:archived like:${CARD_ID} price:<5`),
    ).toBe("poster");
  });
});

describe("sort", () => {
  test("shuffle is a sort and counts as a filter", () => {
    const parsed = parseSearchFilters("sort:shuffle");
    expect(parsed.sort).toBe("shuffle");
    expect(parsed.hasExplicitFilters).toBe(true);
    expect(applySortFilter("poster", "shuffle")).toBe("poster sort:shuffle");
  });

  test("leaves the order to the API unless a sort is given", () => {
    expect(parseSearchFilters("poster").sort).toBeUndefined();
    expect(applySortFilter("poster sort:oldest", "newest")).toBe("poster");
  });

  test("keeps Newest First next to like:, which otherwise orders by closeness", () => {
    const text = applySortFilter(
      "like:k17abcdefghij1234567890abcdefghij",
      "newest",
    );
    expect(text).toContain("sort:newest");
    expect(parseSearchFilters(text).sort).toBe("newest");
  });
});

describe("what a search sends and saves", () => {
  test("sends the words and the qualifiers the API reads itself", () => {
    const parsed = parseSearchFilters(
      'poster type:image tag:design fav trash hue:blue is:todo mood:"moody" price:<50 folder:"Reading list"',
    );
    expect(toApiQuery(parsed)).toBe(
      'poster is:todo mood:moody price:<50 folder:"Reading list"',
    );
  });

  test("saves type, tag, favorites, archive, done and the words as a smart folder", () => {
    expect(
      toSmartFolderQuery(
        parseSearchFilters(
          "poster type:image tag:design fav is:archived sort:oldest",
        ),
      ),
    ).toBe("type:image tag:design is:fav is:archived poster");
  });

  test("won't save Trash, color, style, hex or date filters, or an empty search", () => {
    for (const search of [
      "trash",
      "hue:blue poster",
      "style:minimal",
      "#112233",
      "after:2026-01",
      "",
      "sort:oldest",
    ]) {
      expect(toSmartFolderQuery(parseSearchFilters(search))).toBeNull();
    }
  });
});
