import { Clipboard, closeMainWindow, Icon, showHUD, showToast, Toast } from "@raycast/api";
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
      const toast = await showToast(Toast.Style.Animated, "Copying TOTP Code...");
      try {
        const totp = await bitwarden.getTotp(id, session.token);
        await Clipboard.copy(totp, { transient: getTransientCopyPreference("other") });
        await showHUD("Copied to clipboard.");
        await toast.hide();
        await closeMainWindow({ clearRootSearch: true });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to copy TOTP";
      }
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
