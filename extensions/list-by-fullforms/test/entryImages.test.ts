import { describe, it, expect } from "vitest";
import {
  ENTRY_IMAGE_BASE_URL,
  isFirstPartyImageUrl,
  splitImageBody,
  renderImageCallouts,
} from "../src/lib/entryImages";

describe("isFirstPartyImageUrl", () => {
  it("accepts URLs under the first-party image host", () => {
    expect(isFirstPartyImageUrl(`${ENTRY_IMAGE_BASE_URL}/abc.png`)).toBe(true);
  });

  it("rejects third-party URLs (tracking-pixel guard)", () => {
    expect(isFirstPartyImageUrl("https://evil.example.com/x.png")).toBe(false);
  });

  it("rejects a look-alike host that isn't an exact prefix match", () => {
    expect(
      isFirstPartyImageUrl("https://img.list.fullforms.com.evil.com/x.png"),
    ).toBe(false);
  });

  it("rejects the bare base URL without a path", () => {
    expect(isFirstPartyImageUrl(ENTRY_IMAGE_BASE_URL)).toBe(false);
  });
});

describe("splitImageBody", () => {
  it("splits the first token as URL and the rest as caption", () => {
    expect(
      splitImageBody(`${ENTRY_IMAGE_BASE_URL}/a.png A nice caption`),
    ).toEqual({ url: `${ENTRY_IMAGE_BASE_URL}/a.png`, caption: "A nice caption" });
  });

  it("returns an empty caption when only a URL is present", () => {
    expect(splitImageBody(`${ENTRY_IMAGE_BASE_URL}/a.png`)).toEqual({
      url: `${ENTRY_IMAGE_BASE_URL}/a.png`,
      caption: "",
    });
  });

  it("handles empty input", () => {
    expect(splitImageBody("")).toEqual({ url: "", caption: "" });
  });
});

describe("renderImageCallouts", () => {
  it("returns the input unchanged when there is no callout", () => {
    const text = "Just a plain description\nwith two lines.";
    expect(renderImageCallouts(text)).toBe(text);
  });

  it("rewrites a first-party callout into a bounded markdown image", () => {
    const out = renderImageCallouts(`> Image: ${ENTRY_IMAGE_BASE_URL}/a.png Caption`);
    expect(out).toContain(`![Caption](${ENTRY_IMAGE_BASE_URL}/a.png?raycast-width=`);
    expect(out).toContain("*Caption*");
  });

  it("leaves a non-first-party callout as inert text", () => {
    const line = "> Image: https://evil.example.com/a.png Caption";
    expect(renderImageCallouts(line)).toContain(line);
    expect(renderImageCallouts(line)).not.toContain("![");
  });

  it("emits the image without a caption block when none is given", () => {
    const out = renderImageCallouts(`> Image: ${ENTRY_IMAGE_BASE_URL}/a.png`);
    expect(out).toContain(`![](${ENTRY_IMAGE_BASE_URL}/a.png?raycast-width=`);
    expect(out).not.toContain("**");
  });
});
