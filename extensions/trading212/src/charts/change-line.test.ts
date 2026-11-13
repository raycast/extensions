import { describe, expect, it } from "vitest";
import { changeSpans } from "./change-line";
import { chartTheme } from "./theme";

describe("changeSpans", () => {
  it("colours the change and mutes the rest", () => {
    const t = chartTheme("dark");
    const spans = changeSpans([{ text: "+CZK 70,116.70 · +11.3%", tone: "up" }, { text: " all-time" }], t);
    expect(spans).toBe(
      `<tspan fill="${t.up}" font-weight="600">+CZK 70,116.70 · +11.3%</tspan><tspan fill="${t.mutedText}"> all-time</tspan>`,
    );
  });
  it("uses the down colour for losses and escapes text", () => {
    const t = chartTheme("light");
    const spans = changeSpans([{ text: "−1.1% <x>", tone: "down" }], t);
    expect(spans).toContain(t.down);
    expect(spans).toContain("−1.1% &lt;x&gt;");
  });
});

describe("Raycast colours", () => {
  it("uses Raycast's green and red in dark mode", () => {
    expect(chartTheme("dark").up.toLowerCase()).toBe("#59d499");
    expect(chartTheme("dark").down.toLowerCase()).toBe("#ff6363");
  });
});
