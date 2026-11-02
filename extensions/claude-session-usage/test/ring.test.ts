import { describe, expect, it } from "vitest";
import { AMBER, arcLength, colorFor, GREEN, RED, ringIcon, ringSvg } from "../src/lib/ring";

const decode = (uri: string) => Buffer.from(uri.split(",")[1], "base64").toString();

describe("arcLength", () => {
  const C = 2 * Math.PI * 14;
  it("0 → no arc", () => expect(arcLength(0, 14)).toBeNull());
  it("50 → half circumference", () => expect(arcLength(50, 14)).toBeCloseTo(C / 2, 2));
  it("99.6 and 100 → full", () => {
    expect(arcLength(99.6, 14)).toBe("full");
    expect(arcLength(100, 14)).toBe("full");
  });
  it("99.4 → partial", () => expect(arcLength(99.4, 14)).toBeCloseTo(C * 0.994, 2));
  it("clamps", () => {
    expect(arcLength(-5, 14)).toBeNull();
    expect(arcLength(250, 14)).toBe("full");
  });
});

describe("ringSvg", () => {
  it("0% renders only the track", () => {
    const s = ringSvg({ inner: { pct: 0, color: "#000" } }, "#000");
    expect(s.match(/<circle/g)).toHaveLength(1);
  });
  it("partial arc starts at 12 o'clock with round caps", () => {
    const s = ringSvg({ inner: { pct: 40, color: "#000" } }, "#000");
    expect(s).toContain('transform="rotate(-90 18 18)"');
    expect(s).toContain('stroke-linecap="round"');
  });
  it("full ring has no dasharray", () => {
    const s = ringSvg({ inner: { pct: 100, color: RED } }, "#000");
    expect(s).not.toContain("dasharray");
    expect(s).toContain(RED);
  });
  it("dual has two tracks", () => {
    const s = ringSvg({ outer: { pct: 10, color: "#000" }, inner: { pct: 10, color: "#000" } }, "#000");
    expect(s).toContain('r="14.5"');
    expect(s).toContain('r="8"');
  });
  it("error ring has an exclamation mark", () => {
    expect(ringSvg({ error: true }, "#000")).toContain("<rect");
  });
});

describe("ringIcon", () => {
  it("uses the foreground colour of each appearance when the arc has no colour", () => {
    const i = ringIcon({ inner: { pct: 30 } });
    expect(i.light.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(decode(i.light)).toContain('stroke="#000000" stroke-width="6" stroke-linecap');
    expect(decode(i.dark)).toContain('stroke="#FFFFFF" stroke-width="6" stroke-linecap');
  });
});

describe("colorFor", () => {
  it.each([
    [0, GREEN],
    [69.9, GREEN],
    [70, AMBER],
    [89.9, AMBER],
    [90, RED],
    [100, RED],
  ])("%d → %s", (p, c) => expect(colorFor(p, 70, 90)).toBe(c));
});
