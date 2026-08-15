import { showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { hasAuth, isLegacy } from "../lib/auth";

export default function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [internalLoadingState, setInternalLoadingState] = useState(true);
  const {
    value: hasSeenLegacyPrompt,
    setValue: setHasSeenLegacyPrompt,
    isLoading: storageIsLoading,
  } = useLocalStorage("has-seen-legacy-prompt", false);

  const checkAuth = useCallback(async () => {
    setInternalLoadingState(true);
    try {
      if (!hasAuth() && !isLegacy()) {
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setInternalLoadingState(false);
    }
  }, []);

  const markLegacyPromptAsSeen = useCallback(() => {
    setHasSeenLegacyPrompt(true);
  }, [setHasSeenLegacyPrompt]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading: internalLoadingState || storageIsLoading,
    checkAuth,
    isLegacy: isLegacy(),
    hasSeenLegacyPrompt,
    markLegacyPromptAsSeen,
  };
}
