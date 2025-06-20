import { Action, Clipboard, Icon, Toast, showToast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { getTransientCopyPreference } from "~/utils/preferences";

function CopyNotesAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.notes) return null;

  const handleCopyNotes = async () => {
    try {
      const username = await getUpdatedVaultItem(selectedItem, (item) => item.notes, "Getting notes...");
      if (username) {
        await Clipboard.copy(username, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage("Copied notes to clipboard");
      }
    } catch {
      await showToast(Toast.Style.Failure, "Failed to get notes");
    }
  };

  return <Action title="Copy Notes" icon={Icon.Clipboard} onAction={handleCopyNotes} />;
}

export default CopyNotesAction;
