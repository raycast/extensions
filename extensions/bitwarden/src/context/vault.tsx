import { showToast, Toast } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useReducer } from "react";
import { useVaultItemPublisher } from "~/components/searchVault/context/vaultListeners";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { Folder, Item } from "~/types/vault";
import { captureException } from "~/utils/development";
import useCachedVault from "~/components/searchVault/utils/useVaultCache";

export type VaultState = {
  items: Item[];
  folders: Folder[];
  isLoading: boolean;
  isLocked: boolean;
};

export type VaultContextType = VaultState & {
  isEmpty: boolean;
  isLoading: boolean;
  syncItems: () => Promise<void>;
};

const VaultContext = createContext<VaultContextType | null>(null);

const initialState: VaultState = { items: [], folders: [], isLoading: true, isLocked: false };

export const VaultProvider = ({ children }: PropsWithChildren) => {
  const session = useSession();
  const bitwarden = useBitwarden();
  const publishItems = useVaultItemPublisher();
  const { getCachedVault, cacheVault } = useCachedVault();
  const [state, setState] = useReducer(
    (previous: VaultState, next: Partial<VaultState>) => ({ ...previous, ...next }),
    { ...initialState, ...getCachedVault() }
  );

  const isEmpty = state.items.length == 0;
  const isLoading = session.isLoading || state.isLoading;

  useEffect(() => {
    if (!session.active) return;
    if (session.token) {
      loadItems(session.token);
    } else {
      setState({ isLocked: true });
    }
  }, [session.token, session.active]);

  async function loadItems(sessionToken: string) {
    try {
      const [items, folders] = await Promise.all([
        bitwarden.listItems(sessionToken),
        bitwarden.listFolders(sessionToken),
      ]);
      items.sort(favoriteItemsFirstSorter);
      setState({ isLoading: false, items, folders });

      publishItems(items);
      cacheVault(items, folders);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to load vault.");
      captureException("Failed to load vault items", error);
    }
  }

  async function syncItems() {
    if (session.token) {
      const toast = await showToast(Toast.Style.Animated, "Syncing Items...");
      try {
        await bitwarden.sync(session.token);
        await loadItems(session.token);
        await toast.hide();
      } catch {
        await session.logout();
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to sync. Please try logging in again.";
      }
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
