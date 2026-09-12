import { Clipboard, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyPublicKeyAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.sshKey?.publicKey) return null;

  const handleCopyPublicKey = async () => {
    try {
      const publicKey = await getUpdatedVaultItem(
        selectedItem,
        (item) => item.sshKey?.publicKey,
        "Getting public key..."
      );
      if (publicKey) {
        await Clipboard.copy(publicKey, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage("Copied public key to clipboard");
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get public key");
      captureException("Failed to copy public key", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Copy Public Key"
      icon={Icon.Key}
      onAction={handleCopyPublicKey}
      repromptDescription={`Copying the public key of <${selectedItem.name}>`}
    />
  );
}

export default CopyPublicKeyAction;
