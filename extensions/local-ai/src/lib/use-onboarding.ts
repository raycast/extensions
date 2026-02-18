import { useState, useEffect } from "react";
import { isOnboardingComplete } from "./onboarding";

/**
 * Hook that checks if onboarding has been completed.
 * Returns { needsOnboarding, isChecking, markDone }.
 */
export function useOnboarding() {
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const complete = await isOnboardingComplete();
      setNeedsOnboarding(!complete);
      setIsChecking(false);
    })();
  }, []);

  const markDone = () => {
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, isChecking, markDone };
}
