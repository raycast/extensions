import { Clipboard, Icon, showHUD } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyPasswordAction() {
  const { login, name } = useSelectedVaultItem();
  const password = login?.password;

  if (!password) return null;

  const copyPassword = async () => {
    await Clipboard.copy(password, { transient: getTransientCopyPreference("password") });
    await showHUD("Copied password to clipboard");
  };

  return (
    <ActionWithReprompt
      title="Copy Password"
      icon={Icon.Key}
      onAction={copyPassword}
      repromptDescription={`Copying the password of <${name}>`}
    />
  );
}

export default CopyPasswordAction;
