import { Toast, showToast } from "@raycast/api";
import { useVaultItemSubscriber } from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { Item } from "~/types/vault";

export type Options = {
  onBeforeGetItem?: () => any | Promise<any>;
};

/**
 * Returns a function that will get the latest value of a vault item.
 * If the value is already known, it will be returned immediately.
 * Otherwise, it will wait for the value to be retrieved from the vault.
 */
function useGetUpdatedVaultItem() {
  const getItemFromVault = useVaultItemSubscriber();

  async function getItem<TResult = Item>(
    possiblyCachedItem: Item,
    selector = ((item) => item) as (item: Item) => TResult,
    loadingMessage?: string
  ): Promise<TResult> {
    const currentValue = selector(possiblyCachedItem);
    if (!valueHasSensitiveValuePlaceholder(currentValue)) return currentValue;

    const toast = loadingMessage ? await showToast(Toast.Style.Animated, loadingMessage) : undefined;
    const value = selector(await getItemFromVault(possiblyCachedItem.id));
    await toast?.hide();

    return value;
  }

  return getItem;
}

function valueHasSensitiveValuePlaceholder(value: any) {
  try {
    if (typeof value === "object") {
      return JSON.stringify(value).includes(SENSITIVE_VALUE_PLACEHOLDER);
    }
    if (typeof value === "string") {
      return value === SENSITIVE_VALUE_PLACEHOLDER;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export default useGetUpdatedVaultItem;
