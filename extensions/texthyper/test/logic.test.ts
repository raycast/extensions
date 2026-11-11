import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applySync,
  asUrl,
  continueReading,
  emptyLibrary,
  highlightMarkdown,
  matchesFilter,
  minutesLeft,
  parseTags,
  part,
  pickNext,
  snippetMarkdown,
  textFragmentUrl,
} from "../src/lib/logic.ts";
import type { Article, Highlight, SyncPage } from "../src/lib/types.ts";

let nextId = 1;

function article(attributes: Partial<Article> = {}): Article {
  const id = attributes.id ?? nextId++;
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Article ${id}`,
    author: null,
    site_name: null,
    domain: "example.com",
    word_count: 2000,
    reading_time: 10,
    favicon_url: null,
    status: "ready",
    liked: false,
    archived: false,
    folder_id: null,
    tags: [],
    highlights_count: 0,
    progress: null,
    saved_at: "2026-11-01T10:00:00.000Z",
    ...attributes,
  };
}

function highlight(attributes: Partial<Highlight> = {}): Highlight {
  return {
    id: nextId++,
    article_id: 1,
    quote: { exact: "Calling bullshit makes things happen.", prefix: "", suffix: "" },
    color: "yellow",
    comment: null,
    created_at: "2026-11-02T10:00:00.000Z",
    updated_at: "2026-11-02T10:00:00.000Z",
    ...attributes,
  };
}

function page(attributes: Partial<SyncPage>): SyncPage {
  return { articles: [], highlights: [], folders: [], tags: [], deletions: [], cursor: 1, has_more: false, ...attributes };
}

describe("asUrl", () => {
  test("takes http(s) addresses and bare domains", () => {
    assert.equal(asUrl(" https://example.com/post "), "https://example.com/post");
    assert.equal(asUrl("example.com/post"), "https://example.com/post");
  });

  test("turns down what isn't a page", () => {
    for (const text of ["", "hello", "two words.com", "chrome://newtab", "mailto:me@example.com", "file:///tmp/a.html"]) {
      assert.equal(asUrl(text), undefined, text);
    }
  });
});

test("parseTags splits on commas, drops # and duplicates", () => {
  assert.deepEqual(parseTags(" design, #to cite ,, design"), ["design", "to cite"]);
  assert.deepEqual(parseTags(undefined), []);
});

describe("pickNext", () => {
  test("continues the article read most recently", () => {
    const older = article({ progress: { fraction: 0.5, updated_at: "2026-11-01T00:00:00Z" } });
    const newer = article({ progress: { fraction: 0.2, updated_at: "2026-11-05T00:00:00Z" } });
    assert.equal(pickNext([article(), older, newer])?.article.id, newer.id);
  });

  test("counts only what is left of a half-read article", () => {
    const long = article({ reading_time: 40, progress: { fraction: 0.8, updated_at: "2026-11-05T00:00:00Z" } });
    assert.equal(minutesLeft(long), 8);
    assert.deepEqual(pickNext([long, article({ reading_time: 30 })], 10), { article: long, fits: true });
  });

  test("picks at random among the unread ones that fit", () => {
    const short = article({ reading_time: 5 });
    const medium = article({ reading_time: 9 });
    const long = article({ reading_time: 30 });
    assert.equal(pickNext([short, medium, long], 10, () => 0)?.article.id, short.id);
    assert.equal(pickNext([short, medium, long], 10, () => 0.99)?.article.id, medium.id);
  });

  test("offers the shortest when nothing fits", () => {
    const shortest = article({ reading_time: 12 });
    assert.deepEqual(pickNext([article({ reading_time: 30 }), shortest], 5), { article: shortest, fits: false });
  });

  test("leaves out archived, finished, pending and failed articles", () => {
    const skipped = [
      article({ archived: true }),
      article({ progress: { fraction: 1 } }),
      article({ status: "pending" }),
      article({ status: "failed" }),
    ];
    assert.equal(pickNext(skipped), undefined);
    assert.deepEqual(continueReading(skipped), []);
  });
});

test("matchesFilter follows the lists the API serves", () => {
  const unread = article({ folder_id: 3, tags: ["Design"] });
  const archived = article({ archived: true, liked: true, folder_id: 3, tags: ["Design"] });
  assert.equal(matchesFilter(unread, "state:unread"), true);
  assert.equal(matchesFilter(archived, "state:unread"), false);
  assert.equal(matchesFilter(archived, "state:archived"), true);
  assert.equal(matchesFilter(archived, "state:liked"), true);
  assert.equal(matchesFilter(unread, "state:liked"), false);
  assert.equal(matchesFilter(archived, "state:all"), true);
  assert.equal(matchesFilter(unread, "folder:3"), true);
  assert.equal(matchesFilter(unread, "folder:4"), false);
  assert.equal(matchesFilter(archived, "folder:3"), false);
  assert.equal(matchesFilter(unread, "tag:design"), true);
  assert.equal(matchesFilter(unread, "tag:a:b"), false);
});

describe("applySync", () => {
  test("upserts records and moves the cursor", () => {
    const first = applySync(emptyLibrary("me"), page({ articles: [article({ id: 1, title: "Old" })], cursor: 5 }));
    const second = applySync(
      first,
      page({ articles: [article({ id: 1, title: "New" })], highlights: [highlight({ id: 7 })], cursor: 9 }),
    );
    assert.equal(second.cursor, 9);
    assert.equal(second.articles[1].title, "New");
    assert.equal(second.highlights[7].article_id, 1);
    assert.equal(first.articles[1].title, "Old");
  });

  test("keeps only the fields lists need", () => {
    const library = applySync(emptyLibrary("me"), page({ articles: [article({ id: 1, excerpt: "Long text" })] }));
    assert.equal("excerpt" in library.articles[1], false);
  });

  test("a deleted article takes its highlights along", () => {
    const filled = applySync(
      emptyLibrary("me"),
      page({
        articles: [article({ id: 1 }), article({ id: 2 })],
        highlights: [highlight({ id: 7, article_id: 1 }), highlight({ id: 8, article_id: 2 })],
      }),
    );
    const after = applySync(filled, page({ deletions: [{ record_type: "article", record_id: 1 }], cursor: 3 }));
    assert.deepEqual(Object.keys(after.articles), ["2"]);
    assert.deepEqual(Object.keys(after.highlights), ["8"]);
  });

  test("a record deleted in the page it arrived in stays deleted", () => {
    const after = applySync(
      emptyLibrary("me"),
      page({ highlights: [highlight({ id: 7 })], deletions: [{ record_type: "highlight", record_id: 7 }] }),
    );
    assert.deepEqual(after.highlights, {});
  });
});

test("highlightMarkdown gives the quote, the note and the source", () => {
  const source = article({ title: "How to [really] ship", author: "Scott Berkun", url: "https://example.com/ship" });
  assert.equal(
    highlightMarkdown(highlight({ comment: " The whole chapter. " }), source),
    "> Calling bullshit makes things happen.\n\nThe whole chapter.\n\nScott Berkun, [How to \\[really\\] ship](https://example.com/ship)",
  );
  assert.equal(highlightMarkdown(highlight()), "> Calling bullshit makes things happen.");
});

test("textFragmentUrl points at the quote, long ones by their ends", () => {
  assert.equal(
    textFragmentUrl("https://example.com/a#top", "well-known fact"),
    "https://example.com/a#:~:text=well%2Dknown%20fact",
  );
  const long = "one two three four five six seven eight nine ten eleven twelve";
  assert.equal(
    textFragmentUrl("https://example.com/a", long),
    "https://example.com/a#:~:text=one%20two%20three%20four%20five,eight%20nine%20ten%20eleven%20twelve",
  );
});

test("snippetMarkdown bolds the hits and drops other tags", () => {
  assert.equal(snippetMarkdown("a <mark>hit</mark> &amp; <b>more</b>"), "a **hit** & more");
});

test("part cuts long text and says where the rest starts", () => {
  assert.deepEqual(part("abcdef", 0, 4), { text: "abcd", next_offset: 4 });
  assert.deepEqual(part("abcdef", 4, 4), { text: "ef", next_offset: null });
});
