import { Action, Clipboard, closeMainWindow, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { getTransientCopyPreference } from "~/utils/preferences";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { Item } from "~/types/vault";
import { captureException } from "~/utils/development";

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

  const handleCopyUri = (index: number) => async () => {
    try {
      const uriEntry = await getUpdatedVaultItem(selectedItem, (item) => item.login?.uris?.[index], "Getting uri...");
      if (uriEntry?.uri) {
        await Clipboard.copy(uriEntry.uri, { transient: getTransientCopyPreference("other") });
        await showHUD("Copied to clipboard");
        await closeMainWindow();
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get uri");
      captureException("Failed to copy uri", error);
    }
  };

  const handleCopyTextField = (field: keyof ReturnType<typeof getTextFields>) => async () => {
    try {
      const value = await getUpdatedVaultItem(
        selectedItem,
        (item) => getTextFields(item)[field],
        `Getting ${field}...`
      );
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
      {Object.entries(uriMap).map(([title, content], index) => {
        if (!content) return null;

        return (
          <Action
            key={`${index}-${title}`}
            title={`Copy ${title}`}
            icon={Icon.Clipboard}
            onAction={handleCopyUri(index)}
          />
        );
      })}
      {Object.entries(textFields).map(([fieldKey, content], index) => {
        if (!content) return null;

        const field = fieldKey as keyof ReturnType<typeof getTextFields>;
        const capitalizedTitle = capitalize(field);
        return (
          <ActionWithReprompt
            key={`${index}-${field}`}
            title={`Copy ${capitalizedTitle}`}
            icon={Icon.Clipboard}
            onAction={handleCopyTextField(field)}
            repromptDescription={`Copying the ${capitalizedTitle} of <${selectedItem.name}>`}
          />
        );
      })}
    </>
  );
}

export default CopyTextFieldsActions;
