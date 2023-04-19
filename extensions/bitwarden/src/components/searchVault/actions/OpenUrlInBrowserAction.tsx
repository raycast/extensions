import { Action, Icon, open } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { Item } from "~/types/vault";

function OpenUrlInBrowserAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!getUri(selectedItem)) return null;

  const handleOpenUrlInBrowser = async () => {
    const itemMainUri = await getUpdatedVaultItem(selectedItem, getUri);
    if (itemMainUri) await open(itemMainUri);
  };

  return (
    <Action
      title="Open in Browser"
      onAction={handleOpenUrlInBrowser}
      icon={Icon.Globe}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
  );
}

function getUri(item: Item) {
  return item.login?.uris?.[0]?.uri;
}

export default OpenUrlInBrowserAction;
