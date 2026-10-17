import { describe, expect, it } from "vitest";
import { pulseAnimation } from "@/ui/schedule/pulse-animation";

const path = (width: number, height: number) =>
  `<svg><path d="M0 0" x="10" y="20" width="${width}" height="${height}" fill="#16C77A" /></svg>`;

describe("pulseAnimation", () => {
  it("adds a growing pulse ring around a 32x32 shape, centered on it", () => {
    const result = pulseAnimation(path(32, 32));

    expect(result).toContain('cx="26" cy="36"');
    expect(result).toContain('<circle cx="26" cy="36" r="16"');
    expect(result).toContain('values="16;28"');
    expect(result).toContain('<circle cx="26" cy="36" r="18"');
    expect(result).toContain('values="18;30"');
  });

  it("adds a growing pulse ring around a 24x24 shape, scaled to its size", () => {
    const result = pulseAnimation(path(24, 24));

    expect(result).toContain('cx="22" cy="32"');
    expect(result).toContain('<circle cx="22" cy="32" r="12"');
    expect(result).toContain('values="12;24"');
    expect(result).toContain('<circle cx="22" cy="32" r="14"');
    expect(result).toContain('values="14;26"');
  });

  it("leaves unrelated static dot sizes untouched", () => {
    expect(pulseAnimation(path(12, 12))).toBe(path(12, 12));
    expect(pulseAnimation(path(10, 10))).toBe(path(10, 10));
  });
});
