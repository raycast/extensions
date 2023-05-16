import { showToast, Toast } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useReducer } from "react";
import { useVaultItemPublisher } from "~/components/searchVault/context/vaultListeners";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { Folder, Item, Vault } from "~/types/vault";
import { captureException } from "~/utils/development";
import useVaultCaching from "~/components/searchVault/utils/useVaultCaching";
import { FailedToLoadVaultItemsError, getDisplayableErrorMessage } from "~/utils/errors";

export type VaultState = Vault & {
  isLoading: boolean;
};

export type VaultContextType = VaultState & {
  isEmpty: boolean;
  isLoading: boolean;
  syncItems: () => Promise<void>;
};

const VaultContext = createContext<VaultContextType | null>(null);

const initialState: VaultState = { items: [], folders: [], isLoading: true };

export const VaultProvider = ({ children }: PropsWithChildren) => {
  const session = useSession();
  const bitwarden = useBitwarden();
  const publishItems = useVaultItemPublisher();
  const { getCachedVault, cacheVault } = useVaultCaching();
  const [state, setState] = useReducer(
    (previous: VaultState, next: Partial<VaultState>) => ({ ...previous, ...next }),
    { ...initialState, ...getCachedVault() }
  );

  const isEmpty = state.items.length == 0;
  const isLoading = session.isLoading || state.isLoading;

  useEffect(() => {
    if (!session.active) return;
    if (session.token) {
      void loadItems();
    }
  }, [session.token, session.active]);

  async function loadItems() {
    try {
      let items: Item[] = [];
      let folders: Folder[] = [];
      try {
        [items, folders] = await Promise.all([bitwarden.listItems(), bitwarden.listFolders()]);
        items.sort(favoriteItemsFirstSorter);
      } catch (error) {
        publishItems(new FailedToLoadVaultItemsError());
        throw error;
      }

      setState({ items, folders });
      publishItems(items);
      cacheVault(items, folders);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to load vault items", getDisplayableErrorMessage(error));
      captureException("Failed to load vault items", error);
    } finally {
      setState({ isLoading: false });
    }
  }

  async function syncItems() {
    const toast = await showToast(Toast.Style.Animated, "Syncing Items...");
    try {
      await bitwarden.sync();
      await loadItems();
      await toast.hide();
    } catch (error) {
      await bitwarden.logout();
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to sync. Please try logging in again.";
      toast.message = getDisplayableErrorMessage(error);
    }
  }

  const memoizedValue = useMemo(
    () => ({ ...state, isEmpty, isLoading, syncItems }),
    [state, isEmpty, isLoading, syncItems]
  );

  return <VaultContext.Provider value={memoizedValue}>{children}</VaultContext.Provider>;
};

function favoriteItemsFirstSorter(a: Item, b: Item) {
  if (a.favorite && b.favorite) return 0;
  return a.favorite ? -1 : 1;
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context == null) {
    throw new Error("useVault must be used within a VaultProvider");
  }

  return context;
};
