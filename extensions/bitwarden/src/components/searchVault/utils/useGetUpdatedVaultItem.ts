import { useVaultItemSubscriber } from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { Item } from "~/types/vault";

export type Options = {
  onBeforeGetItem?: () => any | Promise<any>;
};

function useGetUpdatedVaultItem() {
  const getItem = useVaultItemSubscriber();

  return async function <TResult = Item>(
    possiblyCachedItem: Item,
    selector = ((item) => item) as (item: Item) => TResult,
    options?: Options
  ): Promise<TResult> {
    const currentValue = selector(possiblyCachedItem);
    if (currentValue !== SENSITIVE_VALUE_PLACEHOLDER) return currentValue;
    await options?.onBeforeGetItem?.();
    return selector(await getItem(possiblyCachedItem.id));
  };
}

export default useGetUpdatedVaultItem;
