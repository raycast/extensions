import { Toast, showToast } from "@raycast/api";
import { useVaultItemSubscriber } from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { Item } from "~/types/vault";

/**
 * Returns a function that will get the latest value of a vault item.
 * If the value is already known, it will be returned immediately.
 * Otherwise, it will wait for the value to be retrieved from the vault.
 */
function useGetUpdatedVaultItem() {
  const bitwarden = useBitwarden();
  const waitForItemLoaded = useVaultItemSubscriber();

  async function getItemFromVault(id: string): Promise<Item> {
    const itemsResult = await bitwarden.getItem(id);
    if (itemsResult.error) throw itemsResult.error;
    return itemsResult.result;
  }

  async function getItem<TResult = Item>(
    possiblyCachedItem: Item,
    selector = ((item) => item) as (item: Item) => TResult,
    loadingMessage?: string
  ): Promise<TResult> {
    const currentValue = selector(possiblyCachedItem);
    if (!valueHasSensitiveValuePlaceholder(currentValue)) return currentValue;

    const toast = loadingMessage ? await showToast(Toast.Style.Animated, loadingMessage) : undefined;
    const value = selector(
      await Promise.race([waitForItemLoaded(possiblyCachedItem.id), getItemFromVault(possiblyCachedItem.id)])
    );
    await toast?.hide();

    return value;
  }

  return getItem;
}

function valueHasSensitiveValuePlaceholder(value: any) {
  try {
    if (typeof value === "object") return JSON.stringify(value).includes(SENSITIVE_VALUE_PLACEHOLDER);
    if (typeof value === "string") return value === SENSITIVE_VALUE_PLACEHOLDER;
    return false;
  } catch (error) {
    return false;
  }
}

export default useGetUpdatedVaultItem;
