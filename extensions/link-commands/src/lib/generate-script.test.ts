import { describe, expect, it } from "vitest";
import { brandFor, scriptFilename } from "./generate-script";

describe("brandFor", () => {
  it("capitalises a single-word domain label", () => {
    expect(brandFor("https://sendtestemail.com/")).toBe("Sendtestemail");
  });

  it("words a hyphenated label", () => {
    expect(brandFor("https://my-cool-site.com")).toBe("My Cool Site");
  });

  it("reads the registrable part of a subdomain", () => {
    expect(brandFor("https://app.raindrop.io")).toBe("Raindrop");
  });

  it("does not mistake a multi-part suffix for the brand", () => {
    expect(brandFor("https://www.amazon.co.uk")).toBe("Amazon");
  });

  it("stays quiet when the target is not a web URL", () => {
    expect(brandFor("~/Downloads")).toBeUndefined();
    expect(brandFor("https://")).toBeUndefined();
  });
});

describe("filenames", () => {
  it("still derives the file from the lowercase label when the brand is cased", () => {
    expect(scriptFilename({ title: "SendTestEmail", target: "https://sendtestemail.com/" })).toBe("sendtestemail.sh");
    expect(
      scriptFilename({ title: "SendTestEmail", target: "https://sendtestemail.com/", packageName: "SendTestEmail" }),
    ).toBe("sendtestemail.sh");
  });
});
