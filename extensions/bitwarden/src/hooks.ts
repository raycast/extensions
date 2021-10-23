import { getLocalStorageItem, showToast, ToastStyle, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useState, useEffect } from "react";
import { Bitwarden } from "./api";
import { VaultStatus } from "./types";

async function login(api: Bitwarden) {
  try {
    const toast = await showToast(ToastStyle.Animated, "Login in...", "It may takes some time");
    await api.login();
    toast.hide();
  } catch (error) {
    showToast(ToastStyle.Failure, "An error occurred during login!", "Please check your crendentials");
  }
}

const sessionKey = "sessionToken";
export function useBitwarden(
  bitwardenApi: Bitwarden
): [{ sessionToken?: string; vaultStatus?: VaultStatus }, (sessionToken: string | null) => void] {
  const [state, setState] = useState<{ sessionToken?: string; vaultStatus?: VaultStatus }>({});

  useEffect(() => {
    async function getSessionToken() {
      const sessionToken = await getLocalStorageItem<string>(sessionKey);

      const status = await bitwardenApi.status(sessionToken);

      switch (status) {
        case "unlocked":
          setState({ sessionToken: sessionToken, vaultStatus: "unlocked" });
          break;
        case "locked":
          setState({ vaultStatus: "locked" });
          break;
        case "unauthenticated":
          await login(bitwardenApi);
          setState({ vaultStatus: "locked" });
      }
    }
    getSessionToken();
  }, []);

  return [
    state,
    async (sessionToken: string | null) => {
      if (sessionToken) {
        setLocalStorageItem(sessionKey, sessionToken);
        setState({ sessionToken, vaultStatus: "unlocked" });
      } else {
        removeLocalStorageItem(sessionKey);
        setState({ vaultStatus: "locked" });
      }
    },
  ];
}
