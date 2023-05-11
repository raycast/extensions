import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";
import { codeBlock } from "~/utils/strings";

function ShowSecureNoteAction() {
  const { push } = useNavigation();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.notes) return null;

  const showSecureNote = async () => {
    try {
      const notes = await getUpdatedVaultItem(selectedItem, (item) => item.notes, "Getting secure note...");
      if (notes) {
        push(
          <Detail
            markdown={codeBlock(notes)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Secure Note"
                  content={notes}
                  transient={getTransientCopyPreference("other")}
                />
              </ActionPanel>
            }
          />
        );
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get secure note");
      captureException("Failed to show secure note", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Show Secure Note"
      icon={Icon.BlankDocument}
      onAction={showSecureNote}
      repromptDescription={`Showing the note of <${selectedItem.name}>`}
    />
  );
}

export default ShowSecureNoteAction;
