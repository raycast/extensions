import { Clipboard, Icon } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";

function PastePasswordAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.login?.password) return null;

  const pastePassword = async () => {
    // TODO: Show toast while getting password
    const password = await getUpdatedVaultItem(selectedItem, (item) => item.login?.password);
    if (password) await Clipboard.paste(password);
  };

  return (
    <ActionWithReprompt
      title="Paste Password"
      icon={Icon.Key}
      onAction={pastePassword}
      repromptDescription={`Pasting the password of <${selectedItem.name}>`}
    />
  );
}

export default PastePasswordAction;
