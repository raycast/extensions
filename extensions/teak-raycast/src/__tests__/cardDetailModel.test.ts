import { describe, expect, test } from "bun:test";
import type { RaycastCard } from "../lib/api";
import {
  getCardTitle,
  getDetailStatusChips,
  getHeroMediaUrl,
  getOpenableUrl,
  isHttpUrl,
} from "../lib/cardDetailModel";

const baseCard: RaycastCard = {
  id: "card_123456",
  type: "link",
  content: "Line one\nLine two",
  notes: null,
  url: "https://teakvault.com",
  tags: ["design"],
  aiTags: ["inspiration"],
  aiSummary: "Summary",
  isFavorited: true,
  createdAt: 1_739_250_000_000,
  updatedAt: 1_739_250_000_000,
  fileUrl: null,
  thumbnailUrl: null,
  screenshotUrl: null,
  linkPreviewImageUrl: null,
  metadataTitle: "Teak Vault",
  metadataDescription: "Knowledge hub",
};

describe("card detail model", () => {
  test("resolves title from metadata, then content, then typed fallback", () => {
    expect(getCardTitle(baseCard)).toBe("Teak Vault");

    const withoutMetadata = { ...baseCard, metadataTitle: null };
    expect(getCardTitle(withoutMetadata)).toBe("Line one");

    const fallbackCard = {
      ...withoutMetadata,
      content: "   \n ",
      id: "card_abcdef",
      type: "text",
    };
    expect(getCardTitle(fallbackCard)).toBe("TEXT Card • abcdef");
  });

  test("chooses hero media with deterministic global priority", () => {
    const screenshotFirst = {
      ...baseCard,
      screenshotUrl: "https://cdn.teak.test/screenshot.png",
      thumbnailUrl: "https://cdn.teak.test/thumb.png",
      linkPreviewImageUrl: "https://cdn.teak.test/link.png",
    };
    expect(getHeroMediaUrl(screenshotFirst)).toBe(
      screenshotFirst.screenshotUrl,
    );

    const fileAsFallback = {
      ...baseCard,
      fileUrl: "https://cdn.teak.test/upload.webp",
    };
    expect(getHeroMediaUrl(fileAsFallback)).toBe(fileAsFallback.fileUrl);

    const nonRenderableFile = {
      ...baseCard,
      fileUrl: "https://cdn.teak.test/upload.pdf",
    };
    expect(getHeroMediaUrl(nonRenderableFile)).toBeNull();
  });

  test("enforces strict http(s) URL openability", () => {
    expect(isHttpUrl("https://teakvault.com")).toBe(true);
    expect(isHttpUrl("ftp://teakvault.com")).toBe(false);
    expect(isHttpUrl("not-a-url")).toBe(false);

    expect(getOpenableUrl(baseCard)).toBe("https://teakvault.com");
    expect(
      getOpenableUrl({ ...baseCard, url: "mailto:test@teakvault.com" }),
    ).toBeNull();
  });

  test("builds status chips for type, favorite and AI signals", () => {
    expect(getDetailStatusChips(baseCard)).toEqual([
      { kind: "type", text: "link" },
      { kind: "favorite", text: "Favorited" },
      { kind: "aiSummary", text: "AI Summary" },
      { kind: "aiTags", text: "AI Tags" },
    ]);

    expect(
      getDetailStatusChips({
        ...baseCard,
        isFavorited: false,
        aiSummary: null,
        aiTags: [],
      }),
    ).toEqual([
      { kind: "type", text: "link" },
      { kind: "favorite", text: "Not Favorited" },
      { kind: "aiSummary", text: "No Teak Summary" },
      { kind: "aiTags", text: "No Teak Tags" },
    ]);
  });
});
