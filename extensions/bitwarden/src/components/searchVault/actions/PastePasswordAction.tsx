import { Clipboard, Icon, Toast, showToast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";

function PastePasswordAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const actionTitle = useActionTitle();

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
      title={actionTitle}
      icon={Icon.Window}
      onAction={pastePassword}
      repromptDescription={`Pasting the password of <${selectedItem.name}>`}
    />
  );
}

function useActionTitle() {
  const currentApplication = useFrontmostApplicationName();
  return currentApplication ? `Paste Password into ${currentApplication}` : "Paste Password";
}

export default PastePasswordAction;
