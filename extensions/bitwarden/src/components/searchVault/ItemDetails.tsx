import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ItemFieldList from "~/components/searchVault/ItemFieldList";
import { useVaultContext } from "~/context/vault";
import { Item } from "~/types/vault";
import { captureException } from "~/utils/development";
import { ListLoadingView } from "../ListLoadingView";
import VaultItemContext from "./context/vaultItem";
import useGetUpdatedVaultItem from "./utils/useGetUpdatedVaultItem";

enum Status {
  LOADING,
  ERROR,
  COMPLETE,
}

type ItemDetails = {
  selectedItem: Item;
};

/**
 * Detail screen for a single vault item, pushed via {@link ShowItemDetailsAction}.
 *
 * On mount, fetches the latest version of the item from the Bitwarden CLI
 * (via {@link useGetUpdatedVaultItem}) to ensure decrypted field data is
 * up-to-date. While loading, a spinner is shown; on failure, an error view with
 * a "Try Again" action is rendered.
 *
 * Once loaded, the item is placed into {@link VaultItemContext} so that
 * descendant action components (copy, paste, reprompt, etc.) can access it, and
 * the fields are rendered via {@link ItemFieldList}.
 *
 * @param props
 * @param props.selectedItem - The vault item selected from the search list.
 *        Used as the initial value and as the key for re-fetching.
 * @returns A Raycast `List` showing loading, error, empty, or field-list states.
 */
function ItemDetails({ selectedItem }: ItemDetails) {
  const { folders } = useVaultContext();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  const [status, setStatus] = useState<Status>(Status.LOADING);
  const [item, setItem] = useState<Item | null>(selectedItem);
  const [error, setError] = useState<Error | null>(null);

  const fetchItem = useCallback(async () => {
    setStatus(Status.LOADING);
    setError(null);
    setItem(null);
    try {
      const fullItem = await getUpdatedVaultItem(selectedItem, (i) => i);
      setItem(fullItem);
      setStatus(Status.COMPLETE);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus(Status.ERROR);
      captureException("Failed to load item details", err);
    }
  }, [selectedItem]);

  useEffect(() => {
    void fetchItem();
  }, [fetchItem]);

  const tryAgainActionPanel = (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => void fetchItem()} />
    </ActionPanel>
  );

  if (status === Status.LOADING) {
    return (
      <List navigationTitle={`Getting '${selectedItem.name}' details...`} searchBarPlaceholder="Filter fields">
        <ListLoadingView title="Loading..." description="Getting item details." />
      </List>
    );
  }

  if (status === Status.ERROR) {
    return (
      <List navigationTitle={`Failed getting '${selectedItem.name}' details`} searchBarPlaceholder="">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load item"
          description={error?.message}
          actions={tryAgainActionPanel}
        />
      </List>
    );
  }

  if (!item) {
    return (
      <List navigationTitle={`No '${selectedItem.name}' details`} searchBarPlaceholder="">
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No information found"
          description="The Bitwarden CLI responded successfully, but no information was given."
          actions={tryAgainActionPanel}
        />
      </List>
    );
  }

  const folderName = folders.find((f) => f.id === selectedItem.folderId)?.name;
  return (
    <VaultItemContext.Provider value={item}>
      <ItemFieldList item={item} folderName={folderName} />
    </VaultItemContext.Provider>
  );
}

export default ItemDetails;
