import { getLocalStorageItem, showToast, ToastStyle, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import execa from "execa";
import { useState, useEffect } from "react";
import { getWorkflowEnv } from "./utils";

const LocalStorageSessionKey = "sessionToken"
export function useSessionToken(): [string | null | undefined, (sessionToken: string | null) => void] {
  const [sessionToken, setSessionToken] = useState<string | null>();

  useEffect(() => {
    async function getSessionToken() {
      console.debug("Get Session Token");
      const sessionToken = await getLocalStorageItem<string>(LocalStorageSessionKey);

      // Check if last session token is still valid
      console.debug("Get Status");
      const { stdout: jsonStatus } = await execa(
        "bw",
        sessionToken ? ["status", "--session", sessionToken] : ["status"],
        {env: getWorkflowEnv()}
      );
      const { status } = JSON.parse(jsonStatus);

      if (status === "unlocked") setSessionToken(sessionToken);
      else if (status === "locked") setSessionToken(null);
      else if (status === "unauthenticated") {
        try {
          const toast = await showToast(ToastStyle.Animated, "Login in...", "It may takes some time");
          await execa("bw", ["login", "--apikey"], {"env": getWorkflowEnv()});
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
      if (!sessionToken) {
        removeLocalStorageItem(LocalStorageSessionKey);
        setSessionToken(null);
      } else {
        setLocalStorageItem(LocalStorageSessionKey, sessionToken);
        setSessionToken(sessionToken);
      }
    },
  ];
}
