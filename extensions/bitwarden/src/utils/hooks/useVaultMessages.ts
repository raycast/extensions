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
    serverMessage = serverUrl || getServerUrlPreference() || "";
  }

  return { userMessage, serverMessage, shouldShowServer };
}

export default useVaultMessages;
