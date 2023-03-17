import { Action, Icon, showHUD } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";

function CopyUsernameAction() {
  const { login } = useSelectedVaultItem();
  const username = login?.username;

  if (!username) return null;

  const onCopy = () => showHUD("Copied username to clipboard.");

  return (
    <Action.CopyToClipboard
      title="Copy Username"
      icon={Icon.Person}
      content={username}
      onCopy={onCopy}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
    />
  );
}

export default CopyUsernameAction;
