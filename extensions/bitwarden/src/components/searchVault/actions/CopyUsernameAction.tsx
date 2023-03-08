import { Clipboard, Icon } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function CopyUsernameAction() {
  const { login, name } = useSelectedVaultItem();
  const username = login?.username;

  if (!username) return null;

  const copyUsername = async () => Clipboard.copy(username);

  return (
    <ActionWithReprompt
      title="Copy Username"
      icon={Icon.Person}
      onAction={copyUsername}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      repromptDescription={`Copying the username of <${name}>`}
    />
  );
}

export default CopyUsernameAction;
