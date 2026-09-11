import { describe, it, expect } from "vitest";
import { validateTiktok } from "./tiktok";
import type { PostFormValues } from "./types";

const base: PostFormValues = {
  channelId: "chan1",
  text: "hello",
  mode: "shareNow",
  attachmentType: "image",
};

describe("validateTiktok", () => {
  it("throws when there is no image or video attachment", () => {
    expect(() => validateTiktok({ ...base, attachmentType: "none" })).toThrow(
      'TikTok posts require an image or video attachment. Please set the "Attachment Type" field.',
    );
  });

  it("passes with an image attachment", () => {
    expect(() => validateTiktok(base)).not.toThrow();
  });

  it("passes with a video attachment", () => {
    expect(() =>
      validateTiktok({ ...base, attachmentType: "video" }),
    ).not.toThrow();
  });
});
