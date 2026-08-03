import { describe, it, expect } from "vitest";
import { validateMastodon } from "./mastodon";
import type { PostFormValues } from "./types";

const base: PostFormValues = {
  channelId: "chan1",
  text: "",
  mode: "shareNow",
  attachmentType: "none",
};

describe("validateMastodon", () => {
  it("throws when there is no text and no attachment", () => {
    expect(() => validateMastodon(base)).toThrow(
      "Mastodon posts require text, an image, or a video",
    );
  });

  it("passes with text and no attachment", () => {
    expect(() => validateMastodon({ ...base, text: "hello" })).not.toThrow();
  });

  it("passes with an attachment and no text", () => {
    expect(() =>
      validateMastodon({ ...base, attachmentType: "image" }),
    ).not.toThrow();
  });
});
