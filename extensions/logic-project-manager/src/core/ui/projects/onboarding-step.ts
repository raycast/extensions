/** 首次使用引导该做什么：没设共享文件夹时问一次；换了共享文件夹时检查有没有未匹配的 bounce。 */
export type OnboardingStep = "ask-shared" | "check-unmatched" | "skip";

export function onboardingStep(input: {
  folder: string | null;
  askedValue: string | null;
  unmatchedValue: string | null;
}): OnboardingStep {
  if (input.folder === null) {
    return input.askedValue === "true" ? "skip" : "ask-shared";
  }
  return input.unmatchedValue === input.folder ? "skip" : "check-unmatched";
}
