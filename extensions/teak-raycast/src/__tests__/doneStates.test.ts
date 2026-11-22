import { describe, expect, test } from "bun:test";
import type { RaycastCard } from "../lib/api";
import {
  canMarkDone,
  doneActionTitle,
  doneStatusLabel,
  doneToastTitle,
  doneVerb,
} from "../lib/doneStates";

const link = (overrides: Partial<RaycastCard> = {}): RaycastCard => ({
  aiSummary: null,
  aiTags: [],
  appUrl: null,
  content: "https://example.com",
  createdAt: 1,
  fileUrl: null,
  id: "card_1",
  isFavorited: false,
  linkPreviewImageUrl: null,
  metadataDescription: null,
  metadataTitle: null,
  notes: null,
  screenshotUrl: null,
  tags: [],
  thumbnailUrl: null,
  type: "link",
  updatedAt: 1,
  url: "https://example.com",
  ...overrides,
});

describe("done states", () => {
  test.each([
    ["article", "Read"],
    ["movie", "Watched"],
    ["podcast", "Listened"],
    ["product", "Bought"],
    ["recipe", "Cooked"],
    ["game", "Played"],
    ["repo", "Done"],
  ])("names a %s link's mark %s", (linkCategory, label) => {
    expect(doneStatusLabel(link({ linkCategory }))).toBe(label);
    expect(doneActionTitle(link({ linkCategory }))).toBe(`Mark as ${label}`);
  });

  test("falls back to Done for a missing or unknown category", () => {
    expect(doneVerb(null)).toBe("done");
    expect(doneVerb(undefined)).toBe("done");
    expect(doneVerb("something_new")).toBe("done");
  });

  test("turns the action into an undo once the link is done", () => {
    const done = link({ completedAt: 1_739_250_000_000, linkCategory: "book" });
    expect(doneActionTitle(done)).toBe("Mark as Not Read");
    expect(doneToastTitle(done)).toBe("Marked as read");
    expect(doneToastTitle(link({ linkCategory: "book" }))).toBe(
      "Marked as not read",
    );
  });

  test("only links can be marked", () => {
    expect(canMarkDone(link())).toBe(true);
    expect(canMarkDone(link({ type: "text" }))).toBe(false);
  });
});
