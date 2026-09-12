import { describe, it, expect } from "vitest";
import { validateInstagram, buildInstagramMetadata } from "./instagram";
import type { PostFormValues, NetworkContext } from "./types";

const baseValues: PostFormValues = {
  channelId: "chan1",
  text: "hello",
  mode: "shareNow",
  attachmentType: "image",
};

const profileCtx: NetworkContext = {
  isFacebookGroup: false,
  isInstagramProfile: true,
};
const nonProfileCtx: NetworkContext = {
  isFacebookGroup: false,
  isInstagramProfile: false,
};

describe("validateInstagram", () => {
  it("skips the attachment requirement for Instagram Profiles", () => {
    expect(() =>
      validateInstagram({ ...baseValues, attachmentType: "none" }, profileCtx),
    ).not.toThrow();
  });

  it("throws when a non-Profile Instagram post has no attachment", () => {
    expect(() =>
      validateInstagram(
        { ...baseValues, attachmentType: "none" },
        nonProfileCtx,
      ),
    ).toThrow(
      'Instagram posts require an image or video attachment. Please set the "Attachment Type" field.',
    );
  });

  it("allows a non-Profile Instagram post with an attachment", () => {
    expect(() => validateInstagram(baseValues, nonProfileCtx)).not.toThrow();
  });
});

describe("buildInstagramMetadata", () => {
  it("forces a fixed 'post' type with shouldShareToFeed for Instagram Profiles", () => {
    expect(
      buildInstagramMetadata(
        {
          ...baseValues,
          instagramPostType: "reel",
          instagramFirstComment: "hi",
        },
        profileCtx,
      ),
    ).toEqual({ instagram: { type: "post", shouldShareToFeed: true } });
  });

  it("defaults to 'post' type and shouldShareToFeed true when not specified", () => {
    expect(buildInstagramMetadata(baseValues, nonProfileCtx)).toEqual({
      instagram: { type: "post", shouldShareToFeed: true },
    });
  });

  it("includes firstComment and link when provided", () => {
    expect(
      buildInstagramMetadata(
        {
          ...baseValues,
          instagramPostType: "reel",
          instagramShareToFeed: false,
          instagramFirstComment: "First!",
          instagramLink: "https://example.com",
        },
        nonProfileCtx,
      ),
    ).toEqual({
      instagram: {
        type: "reel",
        shouldShareToFeed: false,
        firstComment: "First!",
        link: "https://example.com",
      },
    });
  });
});
