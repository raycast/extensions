import { useEffect, useState } from "react";
import { checkPreferencesOrPrompt } from "./preferences";

export function usePreferencesCheck() {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const valid = await checkPreferencesOrPrompt();
      setIsValid(valid);
      setIsChecking(false);
    }
    check();
  }, []);

  return { isValid, isChecking };
}
