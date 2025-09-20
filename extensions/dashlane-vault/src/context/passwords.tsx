import { Toast, showToast } from "@raycast/api";
import { showFailureToast, useFrecencySorting } from "@raycast/utils";
import { createContext, useContext } from "react";

import { getErrorAction } from "@/helper/error";
import { useCachedPasswords } from "@/hooks/useCachedPasswords";
import { syncVault } from "@/lib/dcli";
import { VaultCredential } from "@/types/dcli";

export type PasswordsContextType = {
  passwords: VaultCredential[] | undefined;
  isLoading: boolean;
  isInitialLoaded: boolean;
  sync: () => void;
  visitItem: (item: VaultCredential) => Promise<void>;
  resetRanking: (item: VaultCredential) => Promise<void>;
};

const PasswordsContext = createContext<PasswordsContextType | undefined>(undefined);

export function PasswordsProvider({ children }: { children: React.ReactNode }) {
  const { passwords, isLoading, isInitialLoaded, revalidate } = useCachedPasswords();
  const { data: sortedPasswords, visitItem, resetRanking } = useFrecencySorting(passwords, { namespace: "passwords" });

  async function sync() {
    try {
      const toast = await showToast({
        title: "Syncing with Dashlane",
        style: Toast.Style.Animated,
      });

      await syncVault();

      toast.style = Toast.Style.Success;
      toast.title = "Sync with Dashlane succeeded";

      await revalidate();

      toast.hide();
    } catch (error) {
      await showFailureToast(error, {
        primaryAction: getErrorAction(error),
      });
    }
  }

  return (
    <PasswordsContext.Provider
      value={{ passwords: sortedPasswords, isLoading, isInitialLoaded, sync, visitItem, resetRanking }}
    >
      {children}
    </PasswordsContext.Provider>
  );
}

export function usePasswordContext() {
  const context = useContext(PasswordsContext);
  if (context === undefined) {
    throw new Error("usePasswordContext must be used within a PasswordsProvider");
  }
  return context;
}
