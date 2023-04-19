import { Action, Clipboard, Icon, showHUD } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyUsernameAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.login?.username) return null;

  const handleCopyUsername = async () => {
    const itemUsername = await getUpdatedVaultItem(selectedItem, (item) => item.login?.username);
    if (itemUsername) {
      await Clipboard.copy(itemUsername, { transient: getTransientCopyPreference("other") });
      await showHUD("Copied to clipboard");
    }
  };

  return (
    <Action
      title="Copy Username"
      icon={Icon.Person}
      onAction={handleCopyUsername}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
    />
  );
}

export default CopyUsernameAction;
