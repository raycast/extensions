import { Action, Icon } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyUsernameAction() {
  const { login } = useSelectedVaultItem();
  const username = login?.username;

  if (!username) return null;

  return (
    <Action.CopyToClipboard
      title="Copy Username"
      icon={Icon.Person}
      content={username}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      transient={getTransientCopyPreference("other")}
    />
  );
}

export default CopyUsernameAction;
