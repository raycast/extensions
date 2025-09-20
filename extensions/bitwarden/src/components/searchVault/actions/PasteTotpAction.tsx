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
      const { error, result: totp } = await bitwarden.getTotp(id);
      if (error) throw error;

      await toast?.hide();
      await Clipboard.paste(totp);
    } catch (error) {
      toast.message = "Failed to get TOTP";
      toast.style = Toast.Style.Failure;
      captureException("Failed to paste TOTP", error);
    }
  };

  return (
    <ActionWithReprompt
      title={currentApplicationName ? `Paste TOTP into ${currentApplicationName}` : "Paste TOTP"}
      icon={Icon.Window}
      onAction={pasteTotp}
      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      repromptDescription={`Pasting the TOTP of <${selectedItem.name}>`}
    />
  );
}

export default PasteTotpAction;
