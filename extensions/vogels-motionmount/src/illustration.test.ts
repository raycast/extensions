import { describe as suite, expect, it } from "vitest";
import { illustration, progress, tvAngle } from "./illustration";

suite("tvAngle", () => {
  it("keeps the TV parallel to the wall when it is not turned", () => {
    expect(tvAngle(0)).toBe(0);
  });

  it("turns the screen toward the side the user picked, seen from above with the wall at the top", () => {
    expect(tvAngle(-100)).toBeGreaterThan(0);
    expect(tvAngle(100)).toBeLessThan(0);
  });
});

suite("illustration", () => {
  it("adapts to the Raycast theme so it never looks pasted in", () => {
    expect(illustration({ distance: 50, rotation: 0 }, "light")).toContain("#1d1d1f");
    expect(illustration({ distance: 50, rotation: 0 }, "dark")).toContain("#f5f5f7");
  });

  it("draws the TV further from the wall the more the arm is extended", () => {
    const tvY = (svg: string) => Number(/translate\([\d.]+ ([\d.]+)\)/.exec(svg)?.[1]);
    expect(tvY(illustration({ distance: 100, rotation: 0 }, "light"))).toBeGreaterThan(
      tvY(illustration({ distance: 0, rotation: 0 }, "light")),
    );
  });
});

suite("progress", () => {
  it("fills the bar in proportion to the finished steps so the user can tell how long is left", () => {
    const filled = (svg: string) => Number(/width="([\d.]+)" height="6" rx="3" fill="#ff9f0a"/.exec(svg)?.[1]);
    expect(filled(progress(0, 15, "light"))).toBe(0);
    expect(filled(progress(15, 15, "light"))).toBe(filled(progress(30, 15, "light")));
    expect(filled(progress(5, 15, "light"))).toBeCloseTo(filled(progress(15, 15, "light")) / 3);
  });
});
