import { Action, Clipboard, closeMainWindow, Icon, showHUD } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { getTransientCopyPreference } from "~/utils/preferences";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { Item } from "~/types/vault";

function CopyTextFieldsActions() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  const uriMap = Object.fromEntries(
    selectedItem.login?.uris?.filter((uri) => uri.uri).map((uri, index) => [`URI ${index + 1}`, uri.uri]) || []
  );

  const getTextFields = (item: Item) => {
    const fieldMap = Object.fromEntries(item.fields?.map((field) => [field.name, field.value]) || []);
    return { notes: item.notes, ...item.card, ...item.identity, ...fieldMap };
  };

  const textFields = getTextFields(selectedItem);

  const onRepromptAction = (field: keyof ReturnType<typeof getTextFields>) => async () => {
    const fieldValue = await getUpdatedVaultItem(selectedItem, (item) => getTextFields(item)[field]);
    if (fieldValue) {
      await Clipboard.copy(fieldValue, { transient: getTransientCopyPreference("other") });
      await showHUD("Copied to Clipboard");
      await closeMainWindow();
    }
  };

  return (
    <>
      {Object.entries(uriMap).map(([title, content], index) => {
        if (!content) return null;

        return (
          <Action.CopyToClipboard
            key={`${index}-${title}`}
            title={`Copy ${title}`}
            icon={Icon.Clipboard}
            content={content}
            transient={getTransientCopyPreference("other")}
          />
        );
      })}
      {Object.entries(textFields).map(([f, content], index) => {
        const field = f as keyof ReturnType<typeof getTextFields>;
        if (!content) return null;

        const capitalizedTitle = capitalize(field);
        return (
          <ActionWithReprompt
            key={`${index}-${field}`}
            title={`Copy ${capitalizedTitle}`}
            icon={Icon.Clipboard}
            onAction={onRepromptAction(field)}
            repromptDescription={`Copying the ${capitalizedTitle} of <${selectedItem.name}>`}
          />
        );
      })}
    </>
  );
}

export default CopyTextFieldsActions;
