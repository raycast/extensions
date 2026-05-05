import { Clipboard, Icon, Toast, showToast } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";

function PasteUsernameAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const currentApplication = useFrontmostApplicationName();

  if (!selectedItem.login?.username) return null;

  const pasteUsername = async () => {
    try {
      const username = await getUpdatedVaultItem(selectedItem, (item) => item.login?.username, "Getting username...");
      if (username) await Clipboard.paste(username);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get username");
      captureException("Failed to paste username", error);
    }
  };

  return (
    <ActionWithReprompt
      title={currentApplication ? `Paste Username into ${currentApplication}` : "Paste Username"}
      icon={Icon.Window}
      onAction={pasteUsername}
      repromptDescription={`Pasting the username of <${selectedItem.name}>`}
      shortcut={{
        macOS: { key: "u", modifiers: ["cmd", "opt"] },
        Windows: { key: "u", modifiers: ["ctrl", "alt"] },
      }}
    />
  );
}

export default PasteUsernameAction;
