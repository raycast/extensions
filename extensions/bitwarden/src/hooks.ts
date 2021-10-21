import { getLocalStorageItem, showToast, ToastStyle, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useState, useEffect } from "react";
import { Bitwarden } from "./api";

const sessionKey = "sessionToken"
export function useSessionToken(bitwardenApi: Bitwarden): [string | null | undefined, (sessionToken: string | null) => void] {
  const [sessionToken, setSessionToken] = useState<string | null>();

  useEffect(() => {
    async function getSessionToken() {
      const sessionToken = await getLocalStorageItem<string>(sessionKey);

      const status = await bitwardenApi.status(sessionToken)

      if (status === "unlocked") setSessionToken(sessionToken);
      else if (status === "locked") setSessionToken(null);
      else if (status === "unauthenticated") {
        try {
          const toast = await showToast(ToastStyle.Animated, "Login in...", "It may takes some time");
          await bitwardenApi.login()
          toast.hide();
          setSessionToken(null);
        } catch (error) {
          showToast(ToastStyle.Failure, "An error occurred during login!", "Please check your crendentials");
        }
      }
    }
    getSessionToken();
  }, []);

  return [
    sessionToken,
    async (sessionToken: string | null) => {
      if (sessionToken) {
        setLocalStorageItem(sessionKey, sessionToken);
        setSessionToken(sessionToken);
      } else {
        removeLocalStorageItem(sessionKey);
        setSessionToken(null);
      }
    },
  ];
}
