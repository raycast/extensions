import { Icon, showHUD } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { copyPassword as copyPasswordToClipboard } from "~/utils/clipboard";

function CopyPasswordAction() {
  const { login, name } = useSelectedVaultItem();
  const password = login?.password;

  if (!password) return null;

  const copyPassword = async () => {
    const { copiedSecurely } = await copyPasswordToClipboard(password);
    await showHUD(copiedSecurely ? "Copied password to clipboard" : "Copied to clipboard");
  };

  return (
    <ActionWithReprompt
      title="Copy Password"
      icon={Icon.CopyClipboard}
      onAction={copyPassword}
      repromptDescription={`Copying the password of <${name}>`}
    />
  );
}

export default CopyPasswordAction;
