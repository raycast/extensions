import { describe, expect, it } from "vitest";

import { HUE_MOODS } from "./hue-tokens";
import { RAYCAST_THEME_SLOTS, buildRaycastThemeDeeplink } from "./raycast-deeplink";

describe("buildRaycastThemeDeeplink", () => {
  it("encodes a Hue mood in the ray.so theme import format", () => {
    const url = new URL(buildRaycastThemeDeeplink(HUE_MOODS.mua));

    expect(url.protocol).toBe("raycast:");
    expect(url.host).toBe("theme");
    expect(url.searchParams.get("name")).toBe("Huế Mưa");
    expect(url.searchParams.get("appearance")).toBe("dark");
    expect(url.searchParams.get("version")).toBe("0.2.0");

    const colors = url.searchParams.get("colors")?.split(",") ?? [];
    expect(colors).toHaveLength(RAYCAST_THEME_SLOTS.length);
    expect(colors.slice(0, 5)).toEqual(["#001F3E", "#0A2E52", "#E5F4FF", "#123F6E", "#00CF6A"]);
  });

  it("marks Huế Cung as a light theme", () => {
    expect(new URL(buildRaycastThemeDeeplink(HUE_MOODS.cung)).searchParams.get("appearance")).toBe("light");
  });
});
