import { Alert, closeMainWindow, confirmAlert, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { useBitwarden } from "~/context/bitwarden";
import { VaultState } from "~/types/general";
import { getServerUrlPreference } from "~/utils/preferences";

function useVaultMessages() {
  const bitwarden = useBitwarden();
  const [vaultState, setVaultState] = useState<VaultState | null>(null);

  useEffect(() => {
    void bitwarden
      .status()
      .then(({ error, result }) => {
        if (!error) setVaultState(result);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const shouldShowServer = !!getServerUrlPreference();

  let userMessage = "...";
  let serverMessage = "...";

  if (vaultState) {
    const { status, userEmail, serverUrl } = vaultState;
    userMessage = status == "unauthenticated" ? "❌ Logged out" : `🔒 Locked (${userEmail})`;
    if (serverUrl) {
      serverMessage = serverUrl || "";
    } else if ((!serverUrl && shouldShowServer) || (serverUrl && !shouldShowServer)) {
      // Hosted state not in sync with CLI (we don't check for equality)
      void confirmAlert({
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
          void popToRoot();
        } else {
          void closeMainWindow();
        }
      });
    }
  }

  return { userMessage, serverMessage, shouldShowServer };
}

export default useVaultMessages;
