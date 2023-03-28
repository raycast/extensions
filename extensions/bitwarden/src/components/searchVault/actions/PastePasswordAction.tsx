import { Clipboard, Icon } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function PastePasswordAction() {
  const { login, name } = useSelectedVaultItem();
  const password = login?.password;

  if (!password) return null;

  const pastePassword = async () => {
    await Clipboard.paste(password);
  };

  return (
    <ActionWithReprompt
      title="Paste Password"
      icon={Icon.Key}
      onAction={pastePassword}
      repromptDescription={`Pasting the password of <${name}>`}
    />
  );
}

export default PastePasswordAction;
