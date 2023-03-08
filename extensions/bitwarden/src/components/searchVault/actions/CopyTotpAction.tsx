import { Clipboard, closeMainWindow, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function CopyTotpAction() {
  const { name, login } = useSelectedVaultItem();
  const bitwarden = useBitwarden();
  const session = useSession();

  const code = login?.totp;

  if (!code) return null;

  const copyTotp = async () => {
    if (session.token) {
      const toast = await showToast(Toast.Style.Success, "Copying TOTP Code...");
      const totp = await bitwarden.getTotp(code, session.token);
      await Clipboard.copy(totp);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      showToast(Toast.Style.Failure, "Failed to fetch TOTP.");
    }
  };

  return (
    <ActionWithReprompt
      title="Copy TOTP"
      icon={Icon.Clipboard}
      onAction={copyTotp}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      repromptDescription={`Copying the TOTP code of <${name}>`}
    />
  );
}

export default CopyTotpAction;
