import { Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";

function CopyPasswordAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.login?.password) return null;

  const handleCopyPassword = async () => {
    const toast = await showToast(Toast.Style.Animated, "Getting password...");
    try {
      const itemPassword = await getUpdatedVaultItem(selectedItem, (item) => item.login?.password);
      if (!itemPassword) {
        await showToast(Toast.Style.Failure, "Failed to get password");
        return;
      }
      copyPassword(itemPassword);
    } finally {
      toast.hide();
    }
  };

  const copyPassword = async (passwordToCopy: string) => {
    await Clipboard.copy(passwordToCopy, { transient: getTransientCopyPreference("password") });
    await showHUD("Copied password to clipboard");
  };

  return (
    <ActionWithReprompt
      title="Copy Password"
      icon={Icon.Key}
      onAction={handleCopyPassword}
      repromptDescription={`Copying the password of <${selectedItem.name}>`}
    />
  );
}

export default CopyPasswordAction;
