import { describe, it, expect } from "vitest";
import { validateFacebook, buildFacebookMetadata } from "./facebook";
import type { PostFormValues, NetworkContext } from "./types";

const baseValues: PostFormValues = {
  channelId: "chan1",
  text: "hello",
  mode: "shareNow",
  attachmentType: "none",
};

const groupCtx: NetworkContext = {
  isFacebookGroup: true,
  isInstagramProfile: false,
};
const pageCtx: NetworkContext = {
  isFacebookGroup: false,
  isInstagramProfile: false,
};

describe("validateFacebook", () => {
  it("skips all validation for Facebook Groups", () => {
    expect(() =>
      validateFacebook(
        { ...baseValues, facebookLinkAttachment: "not a url" },
        groupCtx,
      ),
    ).not.toThrow();
  });

  it("throws when the link attachment URL is invalid", () => {
    expect(() =>
      validateFacebook(
        { ...baseValues, facebookLinkAttachment: "not a url" },
        pageCtx,
      ),
    ).toThrow(/not a valid URL/);
  });

  it("throws when a link attachment is combined with a video asset", () => {
    expect(() =>
      validateFacebook(
        {
          ...baseValues,
          attachmentType: "video",
          facebookLinkAttachment: "https://example.com",
        },
        pageCtx,
      ),
    ).toThrow("A link attachment cannot be combined with a video asset");
  });

  it("allows a link attachment combined with an image asset", () => {
    expect(() =>
      validateFacebook(
        {
          ...baseValues,
          attachmentType: "image",
          facebookLinkAttachment: "https://example.com",
        },
        pageCtx,
      ),
    ).not.toThrow();
  });

  it("allows a valid link attachment with no other assets", () => {
    expect(() =>
      validateFacebook(
        { ...baseValues, facebookLinkAttachment: "https://example.com" },
        pageCtx,
      ),
    ).not.toThrow();
  });

  it("allows no link attachment at all", () => {
    expect(() => validateFacebook(baseValues, pageCtx)).not.toThrow();
  });
});

describe("buildFacebookMetadata", () => {
  it("returns a fixed 'post' type metadata for Facebook Groups", () => {
    expect(
      buildFacebookMetadata(
        { ...baseValues, facebookPostType: "reel", facebookFirstComment: "hi" },
        groupCtx,
      ),
    ).toEqual({ facebook: { type: "post" } });
  });

  it("defaults to 'post' type when not specified", () => {
    expect(buildFacebookMetadata(baseValues, pageCtx)).toEqual({
      facebook: { type: "post" },
    });
  });

  it("includes firstComment and linkAttachment when provided", () => {
    expect(
      buildFacebookMetadata(
        {
          ...baseValues,
          facebookPostType: "story",
          facebookFirstComment: "First!",
          facebookLinkAttachment: "https://example.com",
        },
        pageCtx,
      ),
    ).toEqual({
      facebook: {
        type: "story",
        firstComment: "First!",
        linkAttachment: { url: "https://example.com" },
      },
    });
  });
});
