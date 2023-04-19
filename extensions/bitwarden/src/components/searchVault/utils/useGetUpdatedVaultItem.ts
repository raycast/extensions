import { useVaultItemSubscriber } from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { Item } from "~/types/vault";

function useGetUpdatedVaultItem() {
  const getItem = useVaultItemSubscriber();

  return async function <T = Item>(possiblyCachedItem: Item, selector?: (item: Item) => T): Promise<T> {
    const currentValue = selector?.(possiblyCachedItem) ?? possiblyCachedItem;
    if (currentValue !== SENSITIVE_VALUE_PLACEHOLDER) return currentValue as T;
    const updatedItem = await getItem(possiblyCachedItem.id);
    return (selector?.(updatedItem) ?? updatedItem) as T;
  };
}

export default useGetUpdatedVaultItem;
