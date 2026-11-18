import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `@raycast/api` is aliased to test/raycast-api-stub.ts — see vitest.config.ts.
import {
  revise,
  getItems,
  saveItem,
  setRead,
  setDeleted,
  groupByFolder,
  titleLooksLikeDomain,
  hostname,
  UNSORTED,
  ReadLaterItem,
} from "./api";

// A server item carrying every field this extension does not author.
function serverItem(over: Partial<ReadLaterItem> = {}): ReadLaterItem {
  return {
    url: "https://example.com/a",
    title: "An Article",
    savedAt: 1000,
    read: false,
    updatedAt: 1000,
    deleted: false,
    notes: "my note",
    offline: "saved",
    folder: "Tech",
    ...over,
  };
}

let posted: ReadLaterItem[][];
let fetchMock: ReturnType<typeof vi.fn>;

// Captures what we POST and replays a plausible Worker response.
function mockSync(responseItems: ReadLaterItem[]) {
  fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse((init?.body as string) ?? "{}");
    posted.push(body.items);
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: responseItems }),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  posted = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// The regression this whole file exists for. The Worker merges whole items
// last-write-wins and only restores `folder`; if a write drops `notes` or
// `offline`, that data is gone for the browser and iOS clients too.
describe("write paths preserve fields this extension does not own", () => {
  it("setRead round-trips notes, offline and folder", async () => {
    const item = serverItem();
    mockSync([item]);

    await setRead(item, true);

    expect(posted).toHaveLength(1);
    const sent = posted[0][0];
    expect(sent.read).toBe(true);
    expect(sent.notes).toBe("my note");
    expect(sent.offline).toBe("saved");
    expect(sent.folder).toBe("Tech");
  });

  it("setDeleted tombstones without dropping notes or offline", async () => {
    const item = serverItem();
    mockSync([]);

    await setDeleted(item);

    const sent = posted[0][0];
    expect(sent.deleted).toBe(true);
    expect(sent.notes).toBe("my note");
    expect(sent.offline).toBe("saved");
    expect(sent.folder).toBe("Tech");
  });

  // Guards against a future refactor rebuilding items field-by-field.
  it("revise carries unknown future fields through untouched", () => {
    const withFuture = {
      ...serverItem(),
      somethingAddedLater: "keep me",
    } as ReadLaterItem & { somethingAddedLater: string };

    const out = revise(withFuture, { read: true }) as typeof withFuture;

    expect(out.somethingAddedLater).toBe("keep me");
    expect(out.notes).toBe("my note");
  });

  it("revise always advances updatedAt so the write wins the merge", () => {
    const item = serverItem({ updatedAt: 1000, savedAt: 1000 });
    const out = revise(item, { read: true });
    // The Worker compares max(updatedAt, savedAt); a stale stamp loses.
    expect(out.updatedAt).toBeGreaterThan(
      Math.max(item.updatedAt, item.savedAt),
    );
  });
});

describe("getItems", () => {
  it("posts an empty array, which cannot overwrite anything", async () => {
    mockSync([]);
    await getItems();
    expect(posted[0]).toEqual([]);
  });

  it("hides tombstones from the caller", async () => {
    mockSync([
      serverItem({ url: "https://example.com/live" }),
      serverItem({ url: "https://example.com/dead", deleted: true }),
    ]);
    const items = await getItems();
    expect(items.map((i) => i.url)).toEqual(["https://example.com/live"]);
  });
});

describe("saveItem", () => {
  it("refuses a URL that is already saved", async () => {
    mockSync([serverItem({ url: "https://example.com/a" })]);
    await expect(saveItem("https://example.com/a", "x")).rejects.toThrow(
      "Already saved.",
    );
  });

  it("falls back to the URL when no title could be found", async () => {
    mockSync([]);
    await saveItem("https://example.com/new", "");
    // First POST is the getItems read, second is the write.
    const sent = posted[1][0];
    expect(sent.title).toBe("https://example.com/new");
    expect(sent.read).toBe(false);
    expect(sent.deleted).toBe(false);
  });
});

describe("groupByFolder", () => {
  it("sorts named folders alphabetically and pins Unsorted last", () => {
    const sections = groupByFolder([
      serverItem({ url: "1", folder: "Tech" }),
      serverItem({ url: "2", folder: undefined }),
      serverItem({ url: "3", folder: "Cooking" }),
      serverItem({ url: "4", folder: "Tech" }),
    ]);
    expect(sections.map((s) => s.folder)).toEqual([
      "Cooking",
      "Tech",
      UNSORTED,
    ]);
    expect(sections[1].items).toHaveLength(2);
  });

  // Classification runs after the sync response, so a fresh save has no folder.
  it("treats a freshly saved, unclassified item as Unsorted", () => {
    const sections = groupByFolder([serverItem({ folder: undefined })]);
    expect(sections).toHaveLength(1);
    expect(sections[0].folder).toBe(UNSORTED);
  });
});

describe("titleLooksLikeDomain", () => {
  it.each([
    ["nytimes.com", "https://www.nytimes.com/2026/07/15/story.html", true],
    ["www.nytimes.com", "https://nytimes.com/x", true],
    ["", "https://example.com/x", true],
    ["A Real Headline", "https://www.nytimes.com/x", false],
  ])("%s -> %s", (title, url, expected) => {
    expect(titleLooksLikeDomain(title, url)).toBe(expected);
  });
});

describe("hostname", () => {
  it("strips www and returns the raw string for junk input", () => {
    expect(hostname("https://www.example.com/a")).toBe("example.com");
    expect(hostname("not a url")).toBe("not a url");
  });
});
