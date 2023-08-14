import { Clipboard, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useBitwarden } from "~/context/bitwarden";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";

function PasteTotpAction() {
  const bitwarden = useBitwarden();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const currentApplicationName = useFrontmostApplicationName();

  if (!selectedItem.login?.totp) return null;

  const pasteTotp = async () => {
    const toast = await showToast(Toast.Style.Animated, "Getting TOTP code...");
    try {
      const id = await getUpdatedVaultItem(selectedItem, (item) => item.id);
      const totp = await bitwarden.getTotp(id);
      await toast?.hide();
      await Clipboard.paste(totp);
    } catch (error) {
      toast.message = "Failed to get TOTP";
      toast.style = Toast.Style.Failure;
      captureException("Failed to copy TOTP", error);
    }
  };

  return (
    <ActionWithReprompt
      title={`Paste TOTP into ${currentApplicationName}`}
      icon={Icon.Window}
      onAction={pasteTotp}
      shortcut={{ modifiers: ["ctrl"], key: "t" }}
    />
  );
}

export default PasteTotpAction;
