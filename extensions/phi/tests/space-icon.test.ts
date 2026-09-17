import { describe, expect, it } from "vitest";
import { resolveSpaceIcon } from "../src/space-icon";

const spaceIconData =
  "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAFUlEQVR4nGNgGAWjYBSMglEwCqgDAAZUAAGDHP/NAAAAAElFTkSuQmCC";

describe("Space icons", () => {
  it("converts native PNG data into a Raycast image source", () => {
    expect(resolveSpaceIcon(spaceIconData)).toEqual({
      source: `data:image/png;base64,${spaceIconData}`,
    });
  });

  it("keeps the existing fallback when native icon data is unavailable", () => {
    expect(resolveSpaceIcon(null)).toBeUndefined();
    expect(resolveSpaceIcon(undefined)).toBeUndefined();
  });
});
