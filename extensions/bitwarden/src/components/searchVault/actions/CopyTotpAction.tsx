import { Clipboard, closeMainWindow, Icon, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useBitwarden } from "~/context/bitwarden";
import { useSession } from "~/context/session";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyTotpAction() {
  const { id, name, login } = useSelectedVaultItem();
  const bitwarden = useBitwarden();
  const session = useSession();
  const code = login?.totp;

  if (!code) return null;

  const copyTotp = async () => {
    if (session.token) {
      const toast = await showToast(Toast.Style.Success, "Copying TOTP Code...");
      const totp = await bitwarden.getTotp(id, session.token);
      await Clipboard.copy(totp, { transient: getTransientCopyPreference("other") });
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
      repromptDescription={`Copying the TOTP of <${name}>`}
    />
  );
}

export default CopyTotpAction;
