import { describe, expect, it } from "vitest";
import type { Entry } from "../src/core/messages";
import {
  markdownSource,
  selectedMessageId,
  sessionMessages,
} from "../src/core/native-chat";
import { mergeHistory } from "../src/core/history";

const message = (id: string): Entry => ({
  id,
  kind: "message",
  role: "assistant",
  text: id,
});

describe("current-session transcript", () => {
  it("excludes all history before entry and includes messages arriving during initial loading", () => {
    const entries = [
      { ...message("old"), timestampMs: 99 },
      { ...message("boundary"), timestampMs: 100 },
      { ...message("reply"), timestampMs: 101 },
    ];
    expect(
      sessionMessages(entries, 100, new Set(entries.map((e) => e.id))).map(
        (e) => e.id,
      ),
    ).toEqual(["boundary", "reply"]);
    expect(entries).toHaveLength(3);
  });
  it("excludes initially loaded undated messages, but includes newly observed undated replies", () => {
    expect(
      sessionMessages(
        [message("old"), message("new")],
        100,
        new Set(["old"]),
      ).map((e) => e.id),
    ).toEqual(["new"]);
    expect(
      sessionMessages(
        [{ ...message("invalid"), timestampMs: NaN }],
        100,
        new Set(["invalid"]),
      ),
    ).toEqual([]);
  });
  it("retains this session across polling and hides it on a later visit", () => {
    const entries = [
      { ...message("sent"), timestampMs: 110 },
      { ...message("reply"), timestampMs: 120 },
    ];
    expect(sessionMessages(entries, 100, new Set())).toEqual(entries);
    expect(sessionMessages(entries, 200, new Set(["sent", "reply"]))).toEqual(
      [],
    );
    expect(sessionMessages([], 100, new Set())).toEqual([]);
  });
});

describe("native chat reading position", () => {
  it("opens at latest after an initially empty load", () => {
    expect(selectedMessageId([])).toBeUndefined();
    expect(selectedMessageId([message("older"), message("latest")])).toBe(
      "latest",
    );
  });
  it("does not follow arrivals even when the previously newest message was selected", () => {
    const entries = [message("older"), message("latest"), message("new")];
    expect(selectedMessageId(entries, "latest")).toBe("latest");
    expect(selectedMessageId(entries, "older")).toBe("older");
  });
  it("keeps the selected message through prepended history and streaming replacements", () => {
    const entries = mergeHistory(
      [message("reading")],
      [message("earlier")],
      true,
    );
    const updated = mergeHistory(entries, [
      { ...message("reading"), text: "updated" },
      message("new"),
    ]);
    expect(selectedMessageId(updated, "reading")).toBe("reading");
    expect(updated.map((entry) => entry.id)).toEqual([
      "earlier",
      "reading",
      "new",
    ]);
  });
  it("falls back after selection removal and supports explicit jump to latest", () => {
    const entries = [message("a"), message("b")];
    expect(selectedMessageId(entries, "removed")).toBe("b");
    expect(selectedMessageId(entries, entries.at(-1)?.id)).toBe("b");
    expect(selectedMessageId([], "removed")).toBeUndefined();
  });
});

describe("Markdown source inspection", () => {
  it("preserves paragraphs, math, and nested code fences as literal text", () => {
    const source = "# Heading\n\n```ts\nconst x = 1;\n```\n\\[x^2\\]";
    expect(markdownSource(source)).toBe("````text\n" + source + "\n````");
    expect(markdownSource("plain")).toBe("```text\nplain\n```");
    expect(markdownSource("")).toBe("```text\n\n```");
  });
});
