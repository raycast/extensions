import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import { codeBlock } from "~/utils/strings";

function ShowSecureNoteAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const { push } = useNavigation();

  if (!selectedItem.notes) return null;

  const showSecureNote = async () => {
    const notes = await getUpdatedVaultItem(selectedItem, (item) => item.notes);
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
