import { describe, expect, test } from "bun:test";
import { parseCardsResponse, parseQuickSaveResponse } from "../lib/apiParsers";
import { RaycastApiError } from "../lib/apiErrors";

const sampleCard = {
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
  test("parses a valid cards response", () => {
    const result = parseCardsResponse({
      items: [sampleCard],
      total: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  test("rejects malformed cards response", () => {
    expect(() => {
      parseCardsResponse({
        items: [{ ...sampleCard, createdAt: "invalid" }],
        total: 1,
      });
    }).toThrow(RaycastApiError);
  });

  test("parses a valid quick-save response", () => {
    const result = parseQuickSaveResponse({
      status: "created",
      cardId: "card_123",
    });

    expect(result.status).toBe("created");
    expect(result.cardId).toBe("card_123");
  });

  test("rejects quick-save response with unknown status", () => {
    expect(() => {
      parseQuickSaveResponse({
        status: "saved",
        cardId: "card_123",
      });
    }).toThrow(RaycastApiError);
  });
});
