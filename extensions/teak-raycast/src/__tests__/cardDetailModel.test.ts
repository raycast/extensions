import { describe, expect, mock, test } from "bun:test";
import type { RaycastCard } from "../lib/api";
import { createRaycastApiMock } from "./raycastApiMock";

mock.module("@raycast/api", () => createRaycastApiMock(false));

const {
  formatFileSize,
  formatLinkCategory,
  formatLinkPrice,
  getCardSource,
  getCardTitle,
  getDetailMarkdown,
  getDetailStatusChips,
  getHeroMediaUrl,
  getLinkByline,
  getLinkPublishedDate,
  getOpenableUrl,
  isHttpUrl,
} = await import("../lib/cardDetailModel");

const baseCard: RaycastCard = {
  appUrl: "https://app.teakvault.com/?card=card_123456",
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
    expect(getCardTitle(fallbackCard)).toBe("Untitled text");
    expect(
      getCardTitle({
        ...fallbackCard,
        fileName: "moodboard.jpg",
        type: "image",
      }),
    ).toBe("moodboard.jpg");
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

  test("builds status chips for the type and only the states that are true", () => {
    expect(getDetailStatusChips(baseCard)).toEqual([
      { kind: "type", text: "Link" },
      { kind: "favorite", text: "Favorite" },
    ]);

    expect(getDetailStatusChips({ ...baseCard, isFavorited: false })).toEqual([
      { kind: "type", text: "Link" },
    ]);
  });
});

describe("card detail markdown", () => {
  test("shows palette swatches and copyable hex colors for palette cards", () => {
    const markdown = getDetailMarkdown({
      ...baseCard,
      type: "palette",
      url: null,
      colors: [{ hex: "#112233" }, { hex: "javascript:alert(1)" }],
    });
    expect(markdown).toContain("![#112233](data:image/svg+xml;base64,");
    expect(markdown.match(/data:image\/svg\+xml/g)).toHaveLength(1);
    expect(markdown).not.toContain("javascript:");
  });

  test("includes the transcript and quotes quote cards", () => {
    const markdown = getDetailMarkdown({
      ...baseCard,
      type: "quote",
      content: "Less, but better.",
      aiTranscript: "Spoken words",
    });
    expect(markdown).toContain("> Less, but better.");
    expect(markdown).toContain("## Transcript\n\nSpoken words");
  });

  test("keeps every paragraph of a quote inside the quote", () => {
    const markdown = getDetailMarkdown({
      ...baseCard,
      type: "quote",
      content: "First paragraph.\n\nSecond paragraph.",
    });
    expect(markdown).toContain("> First paragraph.\n>\n> Second paragraph.");
  });

  test("skips content that only repeats a file's name", () => {
    const markdown = getDetailMarkdown({
      ...baseCard,
      type: "document",
      content: "notes.pdf",
      fileName: "notes.pdf",
    });
    expect(markdown).not.toContain("## Content");
  });

  test("skips content that only repeats the title", () => {
    const markdown = getDetailMarkdown({
      ...baseCard,
      content: "Citrus",
      metadataTitle: null,
      type: "palette",
      url: null,
    });
    expect(markdown).toContain("# Citrus");
    expect(markdown).not.toContain("## Content");
  });

  test("skips a link's content when it is only the link's address", () => {
    const link = { ...baseCard, content: baseCard.url ?? "", type: "link" };
    expect(getDetailMarkdown(link)).not.toContain("## Content");
    expect(
      getDetailMarkdown({ ...link, content: "Read the pricing section" }),
    ).toContain("## Content\n\nRead the pricing section");
  });

  test.each([
    [512, "512 B"],
    [4_812_000, "4.6 MB"],
    [52_428_800, "50 MB"],
  ])("formats %i bytes as %s", (bytes, text) => {
    expect(formatFileSize(bytes)).toBe(text);
  });
});

describe("card detail facts", () => {
  test("formats a price in the page's currency, or the bare amount", () => {
    expect(formatLinkPrice({ amount: 29.99, currency: "USD" })).toBe("$29.99");
    expect(formatLinkPrice({ amount: 12, currency: null })).toBe("12");
    expect(formatLinkPrice({ amount: 5, currency: "NOPE!" })).toBe("NOPE! 5");
  });

  test("words a link category", () => {
    expect(formatLinkCategory("design_portfolio")).toBe("Design portfolio");
    expect(formatLinkCategory("article")).toBe("Article");
  });

  test("joins author and publisher, once each", () => {
    expect(
      getLinkByline({
        ...baseCard,
        linkAuthor: "Ada",
        linkPublisher: "The Atlas",
      }),
    ).toBe("Ada · The Atlas");
    expect(
      getLinkByline({ ...baseCard, linkAuthor: "Ada", linkSiteName: "Ada" }),
    ).toBe("Ada");
    expect(getLinkByline(baseCard)).toBeNull();
  });

  test("reads a published date and ignores one it can't read", () => {
    expect(
      getLinkPublishedDate({
        ...baseCard,
        linkPublishedAt: "2026-10-01",
      })?.getUTCFullYear(),
    ).toBe(2026);
    expect(
      getLinkPublishedDate({ ...baseCard, linkPublishedAt: "later" }),
    ).toBeNull();
    expect(getLinkPublishedDate(baseCard)).toBeNull();
  });

  test("says where a saved text came from", () => {
    expect(
      getCardSource({
        ...baseCard,
        sourceTitle: " A page ",
        sourceUrl: "https://www.example.com/post",
      }),
    ).toEqual({
      label: "From example.com",
      title: "A page",
      url: "https://www.example.com/post",
    });
    expect(
      getCardSource({ ...baseCard, sourceUrl: "javascript:alert(1)" }),
    ).toBeNull();
    expect(getCardSource(baseCard)).toBeNull();
  });

  test("chips show a done mark, archive and hidden state", () => {
    const chips = getDetailStatusChips({
      ...baseCard,
      completedAt: 1,
      isArchived: true,
      isHidden: true,
      linkCategory: "movie",
    });
    expect(chips.map((chip) => chip.text)).toEqual(
      expect.arrayContaining(["Watched", "Archived", "Hidden"]),
    );
  });

  test("shows [[ links by their card's title and lists the cards linking here", () => {
    const target = "k17abcdefghij1234567890abcdefghij";
    const markdown = getDetailMarkdown({
      ...baseCard,
      backlinks: [
        {
          id: "k17zzzzzzzzzz1234567890zzzzzzzzzz",
          missing: false,
          title: "Plan",
          type: "text",
        },
      ],
      content: `Compare [[Old|teak:${target}]]`,
      links: [{ id: target, missing: false, title: "New", type: "text" }],
      type: "text",
    });
    expect(markdown).toContain(
      `[New](https://app.teakvault.com/?card=${target})`,
    );
    expect(markdown).not.toContain("teak:");
    expect(markdown).toContain("## Linked from");
    expect(markdown).toContain("[Plan]");
  });

  test("titles a card by the text of a [[ link at the start of its content", () => {
    expect(
      getCardTitle({
        ...baseCard,
        content: "[[Roadmap|teak:k17abcdefghij1234567890abcdefghij]] notes",
        metadataTitle: null,
      }),
    ).toBe("Roadmap notes");
  });
});
