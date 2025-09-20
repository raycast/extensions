import { Clipboard, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyPrivateKeyAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.sshKey?.privateKey) return null;

  const handleCopyPrivateKey = async () => {
    try {
      const privateKey = await getUpdatedVaultItem(
        selectedItem,
        (item) => item.sshKey?.privateKey,
        "Getting private key..."
      );
      if (privateKey) {
        await Clipboard.copy(privateKey, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage("Copied private key to clipboard");
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get private key");
      captureException("Failed to copy private key", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Copy Private Key"
      icon={Icon.Key}
      onAction={handleCopyPrivateKey}
      repromptDescription={`Copying the private key of <${selectedItem.name}>`}
    />
  );
}

export default CopyPrivateKeyAction;
