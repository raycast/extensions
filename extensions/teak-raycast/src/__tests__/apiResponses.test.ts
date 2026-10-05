import { describe, expect, test } from "bun:test";
import { RaycastApiError } from "../lib/apiErrors";
import {
  parseCardsPageResponse,
  parseQuickSaveResponse,
} from "../lib/apiParsers";

const sampleCard = {
  appUrl: "https://app.teakvault.com/?card=card_123",
  id: "card_123",
  type: "link",
  content: "https://teakvault.com",
  notes: null,
  url: "https://teakvault.com",
  tags: ["design"],
  aiTags: ["inspiration"],
  aiSummary: "A link card",
  isFavorited: true,
  createdAt: 1_739_250_000_000,
  updatedAt: 1_739_250_000_000,
  fileUrl: null,
  thumbnailUrl: null,
  screenshotUrl: null,
  linkPreviewImageUrl: null,
  metadataTitle: "Teak",
  metadataDescription: "Personal knowledge hub",
};

describe("raycast api response parsing", () => {
  test("parses a paginated cards page with item-count total", () => {
    const result = parseCardsPageResponse({
      items: [sampleCard],
      pageInfo: { hasMore: false, nextCursor: null },
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  test("rejects cards pages without page info", () => {
    expect(() => {
      parseCardsPageResponse({ items: [sampleCard] });
    }).toThrow(RaycastApiError);
  });

  test("parses a valid quick-save response", () => {
    const result = parseQuickSaveResponse({
      appUrl: "https://app.teakvault.com/?card=card_123",
      card: sampleCard,
      status: "created",
      cardId: "card_123",
    });

    expect(result.status).toBe("created");
    expect(result.cardId).toBe("card_123");
    expect(result.card?.id).toBe("card_123");
  });

  test("rejects quick-save response with unknown status", () => {
    expect(() => {
      parseQuickSaveResponse({
        appUrl: "https://app.teakvault.com/?card=card_123",
        card: sampleCard,
        status: "saved",
        cardId: "card_123",
      });
    }).toThrow(RaycastApiError);
  });
});
