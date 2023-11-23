import { List, Icon, ActionPanel } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import VaultManagementActions from "~/components/searchVault/actions/shared/VaultManagementActions";
import VaultListenersProvider from "~/components/searchVault/context/vaultListeners";
import VaultItem from "~/components/searchVault/Item";
import ListFolderDropdown from "~/components/searchVault/ListFolderDropdown";
import { BitwardenProvider } from "~/context/bitwarden";
import { FavoritesProvider, useSeparateFavoriteItems } from "~/context/favorites";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { Folder, Item } from "~/types/vault";

const SearchVaultCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider>
      <SessionProvider unlock>
        <VaultListenersProvider>
          <VaultProvider>
            <FavoritesProvider>
              <SearchVaultComponent />
            </FavoritesProvider>
          </VaultProvider>
        </VaultListenersProvider>
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

function SearchVaultComponent() {
  const { items, folders, isLoading, isEmpty } = useVaultContext();
  const { favoriteItems, nonFavoriteItems } = useSeparateFavoriteItems(items);

  return (
    <List searchBarPlaceholder="Search vault" isLoading={isLoading} searchBarAccessory={<ListFolderDropdown />}>
      {favoriteItems.length > 0 ? (
        <>
          <List.Section title="Favorites">
            <VaultItemList items={favoriteItems} folders={folders} />
          </List.Section>
          <List.Section title="Other Items">
            <VaultItemList items={nonFavoriteItems} folders={folders} />
          </List.Section>
        </>
      ) : (
        <VaultItemList items={nonFavoriteItems} folders={folders} />
      )}
      {isLoading ? (
        <List.EmptyView icon={Icon.ArrowClockwise} title="Loading..." description="Please wait." />
      ) : (
        <List.EmptyView
          icon={{ source: "bitwarden-64.png" }}
          title={isEmpty ? "Vault empty." : "No matching items found."}
          description={
            isEmpty
              ? "Hit the sync button to sync your vault or try logging in again."
              : "Hit the sync button to sync your vault."
          }
          actions={
            !isLoading && (
              <ActionPanel>
                <VaultManagementActions />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}

function VaultItemList({ items, folders }: { items: Item[]; folders: Folder[] }) {
  return (
    <>
      {items.map((item) => (
        <VaultItem key={item.id} item={item} folder={getItemFolder(folders, item)} />
      ))}
    </>
  );
}

function getItemFolder(folderList: Folder[], item: Item) {
  return folderList.find((folder) => folder.id === item.folderId);
}

export default SearchVaultCommand;
