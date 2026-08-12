import { describe, it, expect } from "vitest";
import { validateStartPage } from "./startpage";
import type { PostFormValues } from "./types";

const base: PostFormValues = {
  channelId: "chan1",
  text: "",
  mode: "shareNow",
  attachmentType: "none",
};

describe("validateStartPage", () => {
  it("throws when there is no text", () => {
    expect(() => validateStartPage(base)).toThrow(
      "Start Page posts require text content",
    );
  });

  it("throws when the text is only whitespace", () => {
    expect(() => validateStartPage({ ...base, text: "   " })).toThrow(
      "Start Page posts require text content",
    );
  });

  it("passes with text", () => {
    expect(() => validateStartPage({ ...base, text: "hello" })).not.toThrow();
  });
});
