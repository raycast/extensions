import { describe, expect, it } from "vitest";

import { hueColor } from "./colors";
import { HUE_MOOD_LIST, MOOD_IDS, isMoodId } from "./hue-tokens";

describe("hueColor", () => {
  it("uses Huế Cung for light themes and the selected dark mood for dark themes", () => {
    expect(hueColor("huong", "accent.primary")).toEqual({ light: "#00753C", dark: "#6FD0A8", adjustContrast: true });
  });

  it("falls back to Huế Mưa on dark themes when Huế Cung is selected", () => {
    expect(hueColor("cung", "accent.primary")).toEqual({ light: "#00753C", dark: "#00CF6A", adjustContrast: true });
  });
});

describe("hue tokens", () => {
  it("lists every mood in order and recognizes mood ids", () => {
    expect(HUE_MOOD_LIST.map((mood) => mood.id)).toEqual([...MOOD_IDS]);
    expect(isMoodId("mua")).toBe(true);
    expect(isMoodId("sunset")).toBe(false);
  });
});
