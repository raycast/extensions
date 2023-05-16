import { Clipboard, Icon, Toast, showToast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";

function PastePasswordAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.login?.password) return null;

  const pastePassword = async () => {
    try {
      const password = await getUpdatedVaultItem(selectedItem, (item) => item.login?.password, "Getting password...");
      if (password) await Clipboard.paste(password);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get password");
      captureException("Failed to paste password", error);
    }
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
