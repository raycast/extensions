import { Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { getTransientCopyPreference } from "~/utils/preferences";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { Item } from "~/types/vault";
import { captureException } from "~/utils/development";
import { showCopySuccessMessage } from "~/utils/clipboard";

type Constraint = RecordOfAny;

export type CopyObjectStringFieldsActionsProps<TValue extends Constraint> = {
  selector: (item: Item) => TValue | null | undefined;
  sorter?: (itemA: [string, any], itemB: [string, any]) => number;
  labelMapper?: (field: keyof TValue) => string;
};

function CopyObjectStringFieldsActions<TValue extends Constraint>({
  selector,
  sorter,
  labelMapper,
}: CopyObjectStringFieldsActionsProps<TValue>) {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const selectedItemEntries = getItemObjectEntries(selectedItem, selector, sorter);

  if (!selectedItemEntries) return null;

  const handleCopyField = (field: string, label: string) => async () => {
    try {
      const value = await getUpdatedVaultItem(selectedItem, (item) => selector(item)?.[field], `Getting ${field}...`);
      if (typeof value !== "string") throw new Error(`Value of ${field} is not a string`);
      if (value) {
        await Clipboard.copy(value, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage(`Copied ${label} to clipboard`);
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to copy ${field}`);
      captureException(`Failed to copy ${field}`, error);
    }
  };

  return (
    <>
      {selectedItemEntries.map(([key, value], index) => {
        if (!value || typeof value !== "string") return null;

        const label = labelMapper?.(key as keyof TValue) ?? capitalize(key);
        return (
          <ActionWithReprompt
            key={`${index}-${key}`}
            title={`Copy ${label}`}
            icon={Icon.Clipboard}
            onAction={handleCopyField(key, label)}
            repromptDescription={`Copying the ${label} of <${selectedItem.name}>`}
          />
        );
      })}
    </>
  );
}

function getItemObjectEntries<TValue extends Constraint>(
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
