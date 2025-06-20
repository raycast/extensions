import { Clipboard, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyKeyFingerprintAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.sshKey?.keyFingerprint) return null;

  const handleCopyKeyFingerprint = async () => {
    try {
      const keyFingerprint = await getUpdatedVaultItem(
        selectedItem,
        (item) => item.sshKey?.keyFingerprint,
        "Getting key fingerprint...",
      );
      if (keyFingerprint) {
        await Clipboard.copy(keyFingerprint, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage("Copied key fingerprint to clipboard");
      }
    } catch {
      await showToast(Toast.Style.Failure, "Failed to get key fingerprint");
    }
  };

  return (
    <ActionWithReprompt
      title="Copy Key Fingerprint"
      icon={Icon.Key}
      onAction={handleCopyKeyFingerprint}
      repromptDescription={`Copying the key fingerprint of <${selectedItem.name}>`}
    />
  );
}

export default CopyKeyFingerprintAction;
