import { useNavigation } from "@raycast/api";
import { useEffect } from "react";
import React from "react";
import { isOnboardingComplete } from "./onboarding-state";
import Onboarding from "../onboarding";

export { markOnboardingComplete } from "./onboarding-state";

export function useFirstRun(): void {
  const { push } = useNavigation();

  useEffect(() => {
    isOnboardingComplete().then((done) => {
      if (!done) {
        push(React.createElement(Onboarding, { _firstRun: true }));
      }
    });
  }, []);
}
