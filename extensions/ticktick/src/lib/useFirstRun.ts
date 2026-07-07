import { LocalStorage, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import React from "react";

const ONBOARDING_KEY = "ticktick_onboarding_v1";

export async function markOnboardingComplete() {
  await LocalStorage.setItem(ONBOARDING_KEY, "done");
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await LocalStorage.getItem<string>(ONBOARDING_KEY);
  return !!val;
}

// Call this at the top of any view command to auto-show onboarding on first run.
// It pushes the onboarding screen on top; "Get Started" in onboarding pops back.
export function useFirstRun(): void {
  const { push } = useNavigation();

  useEffect(() => {
    isOnboardingComplete().then((done) => {
      if (!done) {
        // Lazy import to avoid circular dependency — onboarding imports nothing from here
        const OnboardingModule = require("../onboarding");
        const OnboardingView = OnboardingModule.default;
        push(React.createElement(OnboardingView, { _firstRun: true }));
      }
    });
  }, []);
}
