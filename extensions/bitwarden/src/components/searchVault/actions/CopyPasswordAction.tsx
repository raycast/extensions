import { Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useVaultItemSubscriber } from "~/components/searchVault/context/vaultListeners";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyPasswordAction() {
  const { id, login, name } = useSelectedVaultItem();
  const getItem = useVaultItemSubscriber();

  const password = login?.password;

  if (!password) return null;

  const handleCopyPassword = async () => {
    if (password && password !== SENSITIVE_VALUE_PLACEHOLDER) return copyPassword(password);

    const toast = await showToast(Toast.Style.Animated, "Getting password...");
    try {
      const vaultItem = await getItem(id);
      const itemPassword = vaultItem?.login?.password;
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
      repromptDescription={`Copying the password of <${name}>`}
    />
  );
}

export default CopyPasswordAction;
