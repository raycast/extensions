import { Cache, showToast, Toast } from "@raycast/api";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useReducer } from "react";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { Folder, Item } from "~/types/vault";
import { prepareFoldersForCache, prepareItemsForCache } from "~/utils/cache";
import { captureException } from "~/utils/development";

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

const getCachesItemsAndFolders = (): { items: Item[]; folders: Folder[] } => {
  const cache = new Cache();
  const items = cache.get("items");
  const folders = cache.get("folders");
  return { items: items ? JSON.parse(items) : [], folders: folders ? JSON.parse(folders) : [] };
};

export const VaultProvider = ({ children }: PropsWithChildren) => {
  const session = useSession();
  const bitwarden = useBitwarden();
  const [state, setState] = useReducer(
    (previous: VaultState, next: Partial<VaultState>) => ({ ...previous, ...next }),
    { ...initialState, ...getCachesItemsAndFolders() }
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
      const [folders, items] = await Promise.all([
        bitwarden.listFolders(sessionToken),
        bitwarden.listItems(sessionToken),
      ]);

      const cacheItems = prepareItemsForCache(items);
      const cacheFolders = prepareFoldersForCache(folders);
      const cache = new Cache();
      cache.set("items", JSON.stringify(cacheItems));
      cache.set("folders", JSON.stringify(cacheFolders));

      items.sort(favoriteItemsFirstSorter);
      setState({ isLoading: false, items, folders });
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

export default VaultContext;
