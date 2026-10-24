import { describe, expect, test } from "bun:test";
import { RaycastApiError } from "../lib/apiErrors";
import {
  parseCardsPageResponse,
  parseFolderCardsResult,
  parseFoldersResponse,
  parseQuickSaveResponse,
  parseRaycastCard,
  parseTagOperation,
  parseToolCardId,
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

describe("AI tool card ids", () => {
  test("trims the id the model sent", () => {
    expect(parseToolCardId("  card_123 ")).toBe("card_123");
  });

  test("rejects a missing, blank or non-text id", () => {
    for (const value of [undefined, "", "   ", 42]) {
      expect(() => parseToolCardId(value)).toThrow("cardId is required");
    }
  });
});

describe("newer card fields", () => {
  test("reads archive, done, price, source, link and folder fields", () => {
    const card = parseRaycastCard({
      ...sampleCard,
      archivedAt: 1_739_250_000_001,
      backlinks: [
        { id: "card_9", missing: false, title: "Plan", type: "text" },
      ],
      completedAt: 1_739_250_000_002,
      folderIds: ["folder_1"],
      isArchived: true,
      isHidden: true,
      linkAuthor: "Ada",
      linkCategory: "product",
      linkPrice: { amount: 29.99, currency: "USD" },
      linkPublishedAt: "2026-10-01",
      linkPublisher: "The Atlas",
      linkSiteName: "atlas.example",
      links: [{ id: "card_8", missing: true, title: null, type: null }],
      sourceTitle: "A page",
      sourceUrl: "https://example.com/page",
    });
    expect(card).toMatchObject({
      completedAt: 1_739_250_000_002,
      folderIds: ["folder_1"],
      isArchived: true,
      isHidden: true,
      linkCategory: "product",
      linkPrice: { amount: 29.99, currency: "USD" },
      sourceUrl: "https://example.com/page",
    });
    expect(card.links).toHaveLength(1);
    expect(card.backlinks?.[0]?.title).toBe("Plan");
  });

  test("leaves them undefined for a server that predates them", () => {
    const card = parseRaycastCard(sampleCard);
    expect(card.isArchived).toBeUndefined();
    expect(card.completedAt).toBeUndefined();
    expect(card.linkPrice).toBeUndefined();
    expect(card.links).toBeUndefined();
  });

  test("drops a malformed value instead of rejecting the card", () => {
    const card = parseRaycastCard({
      ...sampleCard,
      completedAt: "yesterday",
      folderIds: [1],
      isArchived: "yes",
      linkPrice: { amount: "free" },
      links: [
        { id: "card_8" },
        { id: "card_9", missing: false, title: "Ok", type: null },
      ],
    });
    expect(card.id).toBe("card_123");
    expect(card.completedAt).toBeUndefined();
    expect(card.folderIds).toBeUndefined();
    expect(card.isArchived).toBeUndefined();
    expect(card.linkPrice).toBeUndefined();
    expect(card.links?.map((link) => link.id)).toEqual(["card_9"]);
  });

  test("keeps the similarity status of a page of similar cards", () => {
    const page = parseCardsPageResponse({
      items: [],
      pageInfo: { hasMore: false, nextCursor: null },
      similarity: "pending",
    });
    expect(page.similarity).toBe("pending");
    expect(
      parseCardsPageResponse({
        items: [],
        pageInfo: { hasMore: false, nextCursor: null },
        similarity: "later",
      }).similarity,
    ).toBeUndefined();
  });
});

describe("folders and tag operations", () => {
  test("reads folders, and rejects ones missing a kind", () => {
    const folder = {
      cardCount: 2,
      color: null,
      id: "folder_1",
      kind: "manual",
      name: "Reading list",
      query: null,
    };
    expect(parseFoldersResponse({ items: [folder] }).items).toHaveLength(1);
    expect(() =>
      parseFoldersResponse({ items: [{ ...folder, kind: "x" }] }),
    ).toThrow(RaycastApiError);
  });

  test("reads which cards a folder took and which it refused", () => {
    expect(
      parseFolderCardsResult({
        failedIds: ["a"],
        folderLimitIds: ["a"],
        updatedIds: ["b"],
      }),
    ).toEqual({ failedIds: ["a"], folderLimitIds: ["a"], updatedIds: ["b"] });
    expect(() => parseFolderCardsResult({ failedIds: [] })).toThrow(
      RaycastApiError,
    );
  });

  test("reads a tag operation's progress and its failure", () => {
    expect(
      parseTagOperation({
        changed: 2,
        error: "boom",
        id: "op_1",
        kind: "merge",
        status: "failed",
        total: 5,
      }),
    ).toEqual({
      changed: 2,
      error: "boom",
      id: "op_1",
      kind: "merge",
      status: "failed",
      total: 5,
    });
    expect(() => parseTagOperation({ id: "op_1", status: "paused" })).toThrow(
      RaycastApiError,
    );
  });
});
