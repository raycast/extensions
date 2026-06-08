import { describe, expect, it } from "vitest";

import { buildSpinFrameOrder, formatSpinWheelMarkdown } from "./spin-wheel";

describe("spin-wheel", () => {
  it("builds a frame order that lands on the winner", () => {
    const frameOrder = buildSpinFrameOrder(4, 2);

    expect(frameOrder[0]).toBe(0);
    expect(frameOrder.at(-1)).toBe(2);
    expect(frameOrder.length).toBeGreaterThan(4);
  });

  it("formats spinning markdown with progress and wheel rows", () => {
    const markdown = formatSpinWheelMarkdown({
      activeIndex: 1,
      items: ["Sushi", "Burgers", "Tacos", "Pasta"],
      phase: "spinning",
      progress: 0.5,
    });

    expect(markdown).toContain("# Spin Decision Wheel");
    expect(markdown).toContain("**Burgers**");
    expect(markdown).toContain("50%");
    expect(markdown).toContain("- **> Burgers**");
  });

  it("formats result markdown with final odds copy", () => {
    const markdown = formatSpinWheelMarkdown({
      activeIndex: 0,
      items: ["Sushi", "Burgers"],
      phase: "result",
      progress: 1,
    });

    expect(markdown).toContain("# Winner Locked In");
    expect(markdown).toContain("Every option had a 1 in 2 shot");
  });
});
