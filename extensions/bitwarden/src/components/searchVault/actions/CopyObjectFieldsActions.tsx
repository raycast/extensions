import { Clipboard, closeMainWindow, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { getTransientCopyPreference } from "~/utils/preferences";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { Item } from "~/types/vault";
import { captureException } from "~/utils/development";

export type CopyObjectStringFieldsActionsProps<TValue extends RecordOfStrings | undefined | null> = {
  selector: (item: Item) => TValue;
  sorter?: (itemA: [string, any], itemB: [string, any]) => number;
};

function CopyObjectStringFieldsActions<TValue extends RecordOfStrings | undefined | null>({
  selector,
  sorter,
}: CopyObjectStringFieldsActionsProps<TValue>) {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const selectedItemEntries = useItemObjectEntries(selectedItem, selector, sorter);

  if (!selectedItemEntries) return null;
  const handleCopyField = (field: string) => async () => {
    try {
      const value = await getUpdatedVaultItem(selectedItem, (item) => selector(item)?.[field], `Getting ${field}...`);
      if (typeof value !== "string") throw new Error("Field value is not a string");
      if (value) {
        await Clipboard.copy(value, { transient: getTransientCopyPreference("other") });
        await showHUD("Copied to clipboard");
        await closeMainWindow();
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to get ${field}`);
      captureException(`Failed to copy ${field}`, error);
    }
  };

  return (
    <>
      {selectedItemEntries.map(([fieldKey, content], index) => {
        if (!content) return null;

        const capitalizedTitle = capitalize(fieldKey);
        return (
          <ActionWithReprompt
            key={`${index}-${fieldKey}`}
            title={`Copy ${capitalizedTitle}`}
            icon={Icon.Clipboard}
            onAction={handleCopyField(fieldKey)}
            repromptDescription={`Copying the ${capitalizedTitle} of <${selectedItem.name}>`}
          />
        );
      })}
    </>
  );
}

function useItemObjectEntries<TValue extends RecordOfAny | undefined | null>(
  selectedItem: Item,
  selector: CopyObjectStringFieldsActionsProps<TValue>["selector"],
  sorter: CopyObjectStringFieldsActionsProps<TValue>["sorter"]
) {
  const value = selector(selectedItem);
  if (value == null) return null;
  const itemEntries = Object.entries(value);
  if (sorter) itemEntries.sort(sorter);

  return itemEntries;
}

export default CopyObjectStringFieldsActions;
