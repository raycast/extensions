import { describe, it, expect } from "vitest";
import {
  getAttachmentRule,
  getAllowedAttachmentTypes,
  NOTIFICATION_CAPABLE_SERVICES,
  GOOGLE_SERVICES,
} from "./index";

describe("getAttachmentRule", () => {
  it("returns the dedicated rule for services with their own network module", () => {
    expect(getAttachmentRule("instagram").allowed).toEqual(["image", "video"]);
    expect(getAttachmentRule("youtube").allowed).toEqual(["video"]);
    expect(getAttachmentRule("pinterest").allowed).toEqual(["image"]);
    expect(getAttachmentRule("startpage").allowed).toEqual(["none", "image"]);
  });

  it("is case-insensitive", () => {
    expect(getAttachmentRule("YouTube").allowed).toEqual(["video"]);
  });

  it("falls back to the default (all attachment types) for services without a network module", () => {
    expect(getAttachmentRule("twitter").allowed).toEqual([
      "none",
      "image",
      "video",
    ]);
    expect(getAttachmentRule("linkedin").allowed).toEqual([
      "none",
      "image",
      "video",
    ]);
  });

  it("falls back to the default rule when no service is given", () => {
    expect(getAttachmentRule(undefined).allowed).toEqual([
      "none",
      "image",
      "video",
    ]);
  });

  it("treats all three Google Business service aliases the same", () => {
    for (const service of GOOGLE_SERVICES) {
      expect(getAttachmentRule(service).allowed).toEqual(["none", "image"]);
    }
  });
});

describe("getAllowedAttachmentTypes", () => {
  it("filters the full attachment type list down to what's allowed", () => {
    const types = getAllowedAttachmentTypes("youtube").map((t) => t.value);
    expect(types).toEqual(["video"]);
  });

  it("returns all three options for services with the default rule", () => {
    const types = getAllowedAttachmentTypes("twitter").map((t) => t.value);
    expect(types).toEqual(["none", "image", "video"]);
  });
});

describe("NOTIFICATION_CAPABLE_SERVICES", () => {
  it("only contains Instagram, TikTok, and YouTube", () => {
    expect([...NOTIFICATION_CAPABLE_SERVICES].sort()).toEqual([
      "instagram",
      "tiktok",
      "youtube",
    ]);
  });
});
