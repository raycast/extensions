import { describe, it, expect } from "vitest";
import { validateYoutube, buildYoutubeMetadata } from "./youtube";
import type { PostFormValues } from "./types";

const validValues: PostFormValues = {
  channelId: "chan1",
  text: "",
  mode: "shareNow",
  attachmentType: "video",
  videoUrl: "https://example.com/video.mp4",
  youtubeTitle: "My Video",
};

describe("validateYoutube", () => {
  it("throws when there is no title", () => {
    expect(() => validateYoutube({ ...validValues, youtubeTitle: "" })).toThrow(
      'YouTube posts require a title. Please set the "YouTube Title" field.',
    );
  });

  it("throws when the title is only whitespace", () => {
    expect(() =>
      validateYoutube({ ...validValues, youtubeTitle: "   " }),
    ).toThrow(/require a title/);
  });

  it("passes with a title", () => {
    expect(() => validateYoutube(validValues)).not.toThrow();
  });
});

describe("buildYoutubeMetadata", () => {
  it("applies defaults when optional fields are not provided", () => {
    expect(buildYoutubeMetadata(validValues)).toEqual({
      youtube: {
        title: "My Video",
        categoryId: "22",
        privacy: "public",
        license: "youtube",
        madeForKids: false,
        embeddable: true,
        notifySubscribers: true,
      },
    });
  });

  it("uses explicit values when provided", () => {
    expect(
      buildYoutubeMetadata({
        ...validValues,
        youtubeCategoryId: "20",
        youtubePrivacy: "private",
        youtubeLicense: "creativeCommon",
        youtubeMadeForKids: true,
        youtubeEmbeddable: false,
        youtubeNotifySubscribers: false,
      }),
    ).toEqual({
      youtube: {
        title: "My Video",
        categoryId: "20",
        privacy: "private",
        license: "creativeCommon",
        madeForKids: true,
        embeddable: false,
        notifySubscribers: false,
      },
    });
  });
});
