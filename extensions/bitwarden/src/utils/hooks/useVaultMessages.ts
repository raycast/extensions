import { Alert, closeMainWindow, confirmAlert, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { Bitwarden } from "../../api";
import { VaultState } from "../../types";
import { getServerUrlPreference } from "../preferences";

function useVaultMessages(bitwardenApi: Bitwarden): {
  userMessage: string;
  serverMessage: string;
  shouldShowServer: boolean;
} {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);

  useEffect(() => {
    bitwardenApi.status().then((vaultState) => {
      setVaultState(vaultState);
    });
  }, []);

  const shouldShowServer = !!getServerUrlPreference();

  let userMessage = "...";
  let serverMessage = "...";

  if (vaultState) {
    const { status, userEmail, serverUrl } = vaultState;
    userMessage = status == "unauthenticated" ? "Logged out" : `Locked (${userEmail})`;
    if (serverUrl) {
      serverMessage = serverUrl || "";
    } else if ((!serverUrl && shouldShowServer) || (serverUrl && !shouldShowServer)) {
      // Hosted state not in sync with CLI (we don't check for equality)
      confirmAlert({
        icon: Icon.ExclamationMark,
        title: "Restart Required",
        message: "Bitwarden server URL preference has been changed since the extension was opened.",
        primaryAction: {
          title: "Close Extension",
        },
        dismissAction: {
          title: "Close Raycast", // Only here to provide the necessary second option
          style: Alert.ActionStyle.Cancel,
        },
      }).then((closeExtension) => {
        if (closeExtension) {
          popToRoot();
        } else {
          closeMainWindow();
        }
      });
    }
  }

  return { userMessage, serverMessage, shouldShowServer };
}

export default useVaultMessages;
