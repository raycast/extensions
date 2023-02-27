import { List, Icon, showToast, closeMainWindow, Toast, Clipboard, ActionPanel } from "@raycast/api";
import { useEffect, useReducer } from "react";
import SearchCommonActions from "~/components/search/CommonActions";
import SearchItem from "~/components/search/Item";
import TroubleshootingGuide from "~/components/TroubleshootingGuide";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider, useSession } from "~/context/session";
import { Folder, Item } from "~/types/search";

function SearchCommand() {
  try {
    return (
      <BitwardenProvider>
        <SessionProvider unlock>
          <Search />
        </SessionProvider>
      </BitwardenProvider>
    );
  } catch (e) {
    return <TroubleshootingGuide />;
  }
}

type State = {
  items: Item[];
  folders: Folder[];
  isLoading: boolean;
  isLocked: boolean;
};

const initialState: State = { items: [], folders: [], isLoading: true, isLocked: false };

function Search() {
  const session = useSession();
  const bitwarden = useBitwarden();
  const [state, setState] = useReducer(
    (previous: State, next: Partial<State>) => ({ ...previous, ...next }),
    initialState
  );

  useEffect(() => {
    const token = session.token;
    if (!session.active) {
      return;
    }
    if (!token) {
      setState({ isLocked: true });
    } else {
      loadItems(token);
    }
  }, [session.token, session.active]);

  async function loadItems(sessionToken: string) {
    try {
      const [folders, items] = await Promise.all([
        bitwarden.listFolders(sessionToken),
        bitwarden.listItems(sessionToken),
      ]);

      items.sort(favoriteItemsFirstSorter);
      setState({ isLoading: false, items, folders });
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load vault.");
    }
  }

  async function copyTotp(id: string) {
    if (session.token) {
      const toast = await showToast(Toast.Style.Success, "Copying TOTP Code...");
      const totp = await bitwarden.getTotp(id, session.token);
      await Clipboard.copy(totp);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  }

  async function syncItems() {
    if (session.token) {
      const toast = await showToast(Toast.Style.Animated, "Syncing Items...");
      try {
        await bitwarden.sync(session.token);
        await loadItems(session.token);
        await toast.hide();
      } catch (error) {
        await session.logout();
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to sync. Please try logging in again.";
      }
    }
  }

  const isVaultEmpty = state.items.length == 0;
  const isVaultLoading = session.isLoading || state.isLoading;

  return (
    <List isLoading={isVaultLoading}>
      {state.items.map((item) => (
        <SearchItem
          key={item.id}
          item={item}
          folder={getItemFolder(state.folders, item)}
          lockVault={session.lock}
          logoutVault={session.logout}
          syncItems={syncItems}
          copyTotp={copyTotp}
        />
      ))}
      {isVaultLoading ? (
        <List.EmptyView icon={Icon.ArrowClockwise} title="Loading..." description="Please wait." />
      ) : (
        <List.EmptyView
          icon={{ source: "bitwarden-64.png" }}
          title={isVaultEmpty ? "Vault empty." : "No matching items found."}
          description={
            isVaultEmpty
              ? "Hit the sync button to sync your vault or try logging in again."
              : "Hit the sync button to sync your vault."
          }
          actions={
            !state.isLoading && (
              <ActionPanel>
                <SearchCommonActions syncItems={syncItems} lockVault={session.lock} logoutVault={session.logout} />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}

function favoriteItemsFirstSorter(a: Item, b: Item) {
  if (a.favorite && b.favorite) return 0;
  return a.favorite ? -1 : 1;
}

function getItemFolder(folderList: Folder[], item: Item) {
  return folderList.find((folder) => folder.id === item.folderId);
}

export default SearchCommand;
