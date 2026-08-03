import { describe, it, expect } from "vitest";
import { resolveSchedulingType } from "./scheduling";

describe("resolveSchedulingType", () => {
  it("forces notification for Facebook Groups regardless of the requested value", () => {
    expect(resolveSchedulingType("automatic", "facebook", true, false)).toBe(
      "notification",
    );
  });

  it("forces notification for Instagram Profiles regardless of the requested value", () => {
    expect(resolveSchedulingType("automatic", "instagram", false, true)).toBe(
      "notification",
    );
  });

  it("forces automatic for services that don't support notification scheduling", () => {
    expect(resolveSchedulingType("notification", "twitter", false, false)).toBe(
      "automatic",
    );
    expect(
      resolveSchedulingType("notification", "facebook", false, false),
    ).toBe("automatic");
  });

  it("preserves the requested value for Instagram, TikTok, and YouTube (non-profile/group)", () => {
    expect(
      resolveSchedulingType("notification", "instagram", false, false),
    ).toBe("notification");
    expect(resolveSchedulingType("automatic", "tiktok", false, false)).toBe(
      "automatic",
    );
    expect(resolveSchedulingType("notification", "youtube", false, false)).toBe(
      "notification",
    );
  });

  it("is case-insensitive for the service name", () => {
    expect(resolveSchedulingType("notification", "TWITTER", false, false)).toBe(
      "automatic",
    );
  });

  it("falls back to the requested value when service is undefined and not a group/profile", () => {
    expect(resolveSchedulingType("notification", undefined, false, false)).toBe(
      "notification",
    );
  });
});
