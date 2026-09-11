import { describe, it, expect } from "vitest";
import { validatePinterest, buildPinterestMetadata } from "./pinterest";
import type { PostFormValues } from "./types";

const validValues: PostFormValues = {
  channelId: "chan1",
  text: "Check out this pin",
  mode: "shareNow",
  attachmentType: "image",
  pinterestBoardId: "board-123",
};

describe("validatePinterest", () => {
  it("throws when there is no board selected", () => {
    expect(() =>
      validatePinterest({ ...validValues, pinterestBoardId: "" }),
    ).toThrow(
      'Pinterest posts require a Board. Please set the "Pinterest Board" field.',
    );
  });

  it("throws when there is no image attachment", () => {
    expect(() =>
      validatePinterest({ ...validValues, attachmentType: "none" }),
    ).toThrow("Pinterest posts require an image attachment.");
  });

  it("throws when a video attachment is selected", () => {
    expect(() =>
      validatePinterest({ ...validValues, attachmentType: "video" }),
    ).toThrow("Pinterest posts do not support video attachments");
  });

  it("throws when there is no text", () => {
    expect(() => validatePinterest({ ...validValues, text: "  " })).toThrow(
      "Pinterest posts require text content",
    );
  });

  it("passes with a board, text, and an image attachment", () => {
    expect(() => validatePinterest(validValues)).not.toThrow();
  });
});

describe("buildPinterestMetadata", () => {
  it("sends only boardServiceId when title/url are not provided", () => {
    expect(buildPinterestMetadata(validValues)).toEqual({
      pinterest: { boardServiceId: "board-123" },
    });
  });

  it("includes title and url when provided", () => {
    expect(
      buildPinterestMetadata({
        ...validValues,
        pinterestTitle: "My Pin",
        pinterestUrl: "https://example.com/product",
      }),
    ).toEqual({
      pinterest: {
        boardServiceId: "board-123",
        title: "My Pin",
        url: "https://example.com/product",
      },
    });
  });

  it("defaults boardServiceId to an empty string when missing", () => {
    expect(
      buildPinterestMetadata({ ...validValues, pinterestBoardId: undefined }),
    ).toEqual({ pinterest: { boardServiceId: "" } });
  });
});
