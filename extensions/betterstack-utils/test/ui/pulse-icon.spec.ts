import { vi } from "vitest";

const environment = vi.hoisted(() => ({ supportPath: "/tmp", raycastVersion: "1.104.21" }));

vi.mock("@raycast/api", () => ({
  Color: { Green: "green", Yellow: "yellow", Red: "red", Blue: "blue" },
  environment,
}));

vi.mock("@/common/utils/svg-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/common/utils/svg-utils")>()),
  toImageDataUri: vi.fn(async () => "data:image/png;base64,frame"),
}));

import { afterEach, describe, expect, it } from "vitest";
import { buildAnimatedPulseIcon, buildPulseFrames, getPulseFrames } from "@/ui/pulse-icon";
import { Appearance } from "@/common/colors";

const COLOR = { light: "#16C77A", dark: "#FF6363" };

describe("buildPulseFrames", () => {
  it("builds a sequence of frames with a growing, fading ring in the given color", () => {
    const frames = buildPulseFrames("#FF6363");

    expect(frames).toHaveLength(2);
    frames.forEach((svg) => {
      expect(svg).toContain("<svg");
      expect(svg).toContain('fill="#FF6363"');
      expect(svg).toContain('stroke="#FF6363"');
    });

    expect(frames[0]).toContain('r="6"');
    expect(frames[0]).toContain('opacity="0.45"');
    expect(frames[frames.length - 1]).toContain('r="7"');
    expect(frames[frames.length - 1]).toContain('opacity="0.00"');
  });
});

describe("buildAnimatedPulseIcon", () => {
  it("draws the on-call pulse rings around a centered dot that fit inside the viewBox", () => {
    const svg = buildAnimatedPulseIcon("#FF6363");

    expect(svg).toContain('viewBox="0 0 56 56"');
    expect(svg).toContain('<circle cx="28" cy="28" r="12" fill="#FF6363"');
    expect(svg).toContain('values="12;24"');
    expect(svg).toContain('values="14;26"');
    expect(svg).toContain('repeatCount="indefinite"');
  });
});

describe("getPulseFrames", () => {
  afterEach(() => {
    environment.raycastVersion = "1.104.21";
  });

  it("returns a single animated SVG on Raycast v2", async () => {
    environment.raycastVersion = "2.6.2.0";

    const frames = await getPulseFrames(COLOR, Appearance.DARK);

    expect(frames).toHaveLength(1);
    expect(decodeURIComponent(frames[0])).toContain('<circle cx="28" cy="28" r="12" fill="#FF6363"');
  });

  it("returns rasterized static frames on Raycast v1", async () => {
    const frames = await getPulseFrames(COLOR, Appearance.LIGHT);

    expect(frames).toEqual(["data:image/png;base64,frame", "data:image/png;base64,frame"]);
  });
});
