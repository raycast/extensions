import { showToast, Toast } from "@raycast/api";
import { createContext, ReactNode, useContext, useMemo, useReducer } from "react";
import { useVaultItemPublisher } from "~/components/searchVault/context/vaultListeners";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { Folder, Item, Vault } from "~/types/vault";
import { captureException } from "~/utils/development";
import useVaultCaching from "~/components/searchVault/utils/useVaultCaching";
import { FailedToLoadVaultItemsError, getDisplayableErrorMessage } from "~/utils/errors";
import useOnceEffect from "~/utils/hooks/useOnceEffect";
import { useCachedState } from "@raycast/utils";
import { CACHE_KEYS, FOLDER_OPTIONS } from "~/constants/general";

export type VaultState = Vault & {
  isLoading: boolean;
};

export type VaultContextType = VaultState & {
  isEmpty: boolean;
  syncItems: () => Promise<void>;
  loadItems: () => Promise<void>;
  currentFolderId: Nullable<string>;
  setCurrentFolder: (folderOrId: Nullable<string | Folder>) => void;
};

const VaultContext = createContext<VaultContextType | null>(null);

function getInitialState(fetchOnMount = true): VaultState {
  return { items: [], folders: [], isLoading: fetchOnMount };
}

export type VaultProviderProps = {
  children: ReactNode;
  fetchOnMount?: boolean;
};

export function VaultProvider(props: VaultProviderProps) {
  const { children, fetchOnMount = true } = props;

  const session = useSession();
  const bitwarden = useBitwarden();
  const publishItems = useVaultItemPublisher();
  const { getCachedVault, cacheVault } = useVaultCaching();

  const [currentFolderId, setCurrentFolderId] = useCachedState<Nullable<string>>(CACHE_KEYS.CURRENT_FOLDER_ID, null);
  const [state, setState] = useReducer(
    (previous: VaultState, next: Partial<VaultState>) => ({ ...previous, ...next }),
    { ...getInitialState(fetchOnMount), ...getCachedVault() }
  );

  useOnceEffect(() => {
    void loadItems();
  }, fetchOnMount && session.active && session.token);

  async function loadItems() {
    try {
      setState({ isLoading: true });

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

  async function setCurrentFolder(folderOrId: Nullable<string | Folder>) {
    setCurrentFolderId(typeof folderOrId === "string" ? folderOrId : folderOrId?.id);
  }

  const memoizedValue: VaultContextType = useMemo(
    () => ({
      ...state,
      items: filterItemsByFolderId(state.items, currentFolderId),
      isEmpty: state.items.length == 0,
      isLoading: state.isLoading || session.isLoading,
      currentFolderId,
      syncItems,
      loadItems,
      setCurrentFolder,
    }),
    [state, session.isLoading, currentFolderId, syncItems, loadItems, setCurrentFolder]
  );

  return <VaultContext.Provider value={memoizedValue}>{children}</VaultContext.Provider>;
}

function filterItemsByFolderId(items: Item[], folderId: Nullable<string>) {
  if (!folderId || folderId === FOLDER_OPTIONS.ALL) return items;
  if (folderId === FOLDER_OPTIONS.NO_FOLDER) return items.filter((item) => item.folderId === null);
  return items.filter((item) => item.folderId === folderId);
}

function favoriteItemsFirstSorter(a: Item, b: Item) {
  if (a.favorite && b.favorite) return 0;
  return a.favorite ? -1 : 1;
}

export const useVaultContext = () => {
  const context = useContext(VaultContext);
  if (context == null) {
    throw new Error("useVault must be used within a VaultProvider");
  }

  return context;
};
