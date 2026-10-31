import { describe, expect, it } from "vitest";
import { escapeMarkdown, formatDuration, formatProgressLine, formatVolume, toLargeArtworkUrl } from "../format";

describe("format", () => {
  it("formats durations as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
  });

  it("places the progress knob proportionally and clamps overflow", () => {
    expect(formatProgressLine(0, 60_000)).toBe(`0:00 ●${"─".repeat(23)} 1:00`);
    expect(formatProgressLine(90_000, 60_000)).toBe(`1:30 ${"━".repeat(23)}● 1:00`);
    expect(formatProgressLine(5_000, 0)).toBe(`0:05 ●${"─".repeat(23)} 0:00`);
  });

  it("formats volume as a percentage", () => {
    expect(formatVolume(0.456)).toBe("46%");
  });

  it("upgrades artwork urls to the large variant", () => {
    expect(toLargeArtworkUrl("https://i1.sndcdn.com/a-large.jpg")).toBe("https://i1.sndcdn.com/a-t500x500.jpg");
    expect(toLargeArtworkUrl(null)).toBeNull();
  });

  it("escapes markdown control characters", () => {
    expect(escapeMarkdown("a*b_c `e` #f")).toBe("a\\*b\\_c \\`e\\` \\#f");
  });

  it("leaves brackets alone so Raycast does not render them as math", () => {
    expect(escapeMarkdown("Track [FREE DL]")).toBe("Track [FREE DL]");
  });
});
