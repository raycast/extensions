import { Action, Clipboard, Icon, Toast, showHUD, showToast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyUsernameAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.login?.username) return null;

  const handleCopyUsername = async () => {
    try {
      let toast: Toast | undefined;
      const username = await getUpdatedVaultItem(selectedItem, (item) => item.login?.username, {
        onBeforeGetItem: async () => (toast = await showToast(Toast.Style.Animated, "Getting username...")),
      });
      await toast?.hide();
      if (username) {
        await Clipboard.copy(username, { transient: getTransientCopyPreference("other") });
        await showHUD("Copied to clipboard");
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get username");
      captureException("Failed to copy username", error);
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
