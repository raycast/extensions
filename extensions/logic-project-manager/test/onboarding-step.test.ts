import { describe, expect, it } from "vitest";
import { onboardingStep } from "@/core/ui/projects/onboarding-step";

describe("onboardingStep", () => {
  it("没设共享文件夹、也没问过时，问一次", () => {
    expect(onboardingStep({ folder: null, askedValue: null, unmatchedValue: null })).toBe("ask-shared");
  });

  it("没设共享文件夹、已经问过时跳过", () => {
    expect(onboardingStep({ folder: null, askedValue: "true", unmatchedValue: null })).toBe("skip");
  });

  it("设了共享文件夹、还没为它检查过时检查未匹配", () => {
    expect(onboardingStep({ folder: "/bounces", askedValue: "true", unmatchedValue: null })).toBe("check-unmatched");
  });

  it("同一个共享文件夹已经检查过时跳过", () => {
    expect(onboardingStep({ folder: "/bounces", askedValue: "true", unmatchedValue: "/bounces" })).toBe("skip");
  });

  it("换了共享文件夹时重新检查", () => {
    expect(onboardingStep({ folder: "/new", askedValue: "true", unmatchedValue: "/old" })).toBe("check-unmatched");
  });
});
