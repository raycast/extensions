import { Clipboard, closeMainWindow, Icon, showHUD, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useBitwarden } from "~/context/bitwarden";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";

function CopyTotpAction() {
  const bitwarden = useBitwarden();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.login?.totp) return null;

  const copyTotp = async () => {
    const toast = await showToast(Toast.Style.Animated, "Getting TOTP code...");
    try {
      const id = await getUpdatedVaultItem(selectedItem, (item) => item.id);
      const totp = await bitwarden.getTotp(id);
      await toast?.hide();
      await Clipboard.copy(totp, { transient: getTransientCopyPreference("other") });
      await showHUD("Copied to clipboard");
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      toast.message = "Failed to get TOTP";
      toast.style = Toast.Style.Failure;
      captureException("Failed to copy TOTP", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Copy TOTP"
      icon={Icon.Clipboard}
      onAction={copyTotp}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      repromptDescription={`Copying the TOTP of <${selectedItem.name}>`}
    />
  );
}

export default CopyTotpAction;
