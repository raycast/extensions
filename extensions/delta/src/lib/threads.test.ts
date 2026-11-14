import { describe, expect, it } from "vitest";
import {
  buildThreadMarkdown,
  filterThreads,
  getThreadDeeplink,
  getThreadTitle,
  getThreadWebUrl,
  isAskableQuestion,
  sortThreadsNewestFirst,
  threadMatchesSearch,
} from "./threads";
import { Thread } from "./types";

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: "ksQQ-id",
    name: "PantryPal",
    archived: false,
    join_id: "thread_01",
    status: null,
    created_at_utc: "2026-11-04 11:09:22 UTC",
    index: 0,
    generated_title: null,
    summary: null,
    keywords: [],
    intents: [],
    ...overrides,
  };
}

describe("getThreadTitle", () => {
  it("prefers the thread name", () => {
    expect(getThreadTitle(makeThread({ name: "PantryPal", generated_title: "Fix push" }))).toBe("PantryPal");
  });

  it("falls back to the generated title, then a placeholder", () => {
    expect(getThreadTitle(makeThread({ name: "  ", generated_title: "Fix push" }))).toBe("Fix push");
    expect(getThreadTitle(makeThread({ name: "", generated_title: null }))).toBe("Untitled Thread");
  });
});

describe("thread links", () => {
  it("builds the desktop deeplink from the thread id", () => {
    expect(getThreadDeeplink({ id: "ksQQ-id" })).toBe("delta://thread/ksQQ-id");
  });

  it("builds the web link only when the thread has a join id", () => {
    expect(getThreadWebUrl({ join_id: "thread_01" })).toBe("https://delta.dev/join/thread_01");
    expect(getThreadWebUrl({ join_id: null })).toBeUndefined();
  });
});

describe("filterThreads and sortThreadsNewestFirst", () => {
  const active = makeThread({ id: "a", index: 1 });
  const archived = makeThread({ id: "b", index: 2, archived: true });
  const newest = makeThread({ id: "c", index: 3 });

  it("filters by archive state", () => {
    expect(filterThreads([active, archived, newest], "active").map((t) => t.id)).toEqual(["a", "c"]);
    expect(filterThreads([active, archived, newest], "archived").map((t) => t.id)).toEqual(["b"]);
    expect(filterThreads([active, archived, newest], "all")).toHaveLength(3);
  });

  it("sorts newest first without mutating the input", () => {
    const input = [active, newest, archived];
    expect(sortThreadsNewestFirst(input).map((t) => t.id)).toEqual(["c", "b", "a"]);
    expect(input.map((t) => t.id)).toEqual(["a", "c", "b"]);
  });
});

describe("buildThreadMarkdown", () => {
  it("includes the generated title, summary and goals", () => {
    const markdown = buildThreadMarkdown(
      makeThread({ generated_title: "Fix push", summary: "Push is blocked.", intents: ["Keep history"] }),
    );
    expect(markdown).toBe("## PantryPal\n\n_Fix push_\n\nPush is blocked.\n\n### Goals\n\n- Keep history");
  });

  it("explains when there's no summary and skips a duplicate generated title", () => {
    const markdown = buildThreadMarkdown(makeThread({ generated_title: "PantryPal" }));
    expect(markdown).toBe("## PantryPal\n\nDelta hasn't summarized this thread yet.");
  });
});

describe("threadMatchesSearch", () => {
  const thread = makeThread({
    name: "PantryPal",
    generated_title: "Fix shallow update",
    summary: "Push to GitLab is blocked.",
    keywords: ["force push"],
  });

  it("matches every word across title, generated title, summary and keywords", () => {
    expect(threadMatchesSearch(thread, "pantrypal gitlab")).toBe(true);
    expect(threadMatchesSearch(thread, "SHALLOW force")).toBe(true);
  });

  it("requires all words to match", () => {
    expect(threadMatchesSearch(thread, "pantrypal android")).toBe(false);
  });

  it("matches everything for blank search text", () => {
    expect(threadMatchesSearch(thread, "   ")).toBe(true);
  });
});

describe("isAskableQuestion", () => {
  it("needs at least three non-space characters", () => {
    expect(isAskableQuestion(" ab ")).toBe(false);
    expect(isAskableQuestion("why")).toBe(true);
  });
});
