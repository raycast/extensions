import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { captureException } from "~/utils/development";
import { getTransientCopyPreference } from "~/utils/preferences";

function ShowNotesAction() {
  const { push } = useNavigation();
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  if (!selectedItem.notes) return null;

  const showNotes = async () => {
    try {
      const notes = await getUpdatedVaultItem(selectedItem, (item) => item.notes, "Getting notes...");
      if (notes) {
        push(
          <Detail
            markdown={getNotesDetailsMarkdown(selectedItem.name, notes)}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Notes"
                  content={notes}
                  transient={getTransientCopyPreference("other")}
                />
              </ActionPanel>
            }
          />
        );
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get notes");
      captureException("Failed to show notes", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Show Notes"
      icon={Icon.BlankDocument}
      onAction={showNotes}
      repromptDescription={`Showing the notes of <${selectedItem.name}>`}
    />
  );
}

function getNotesDetailsMarkdown(itemName: string, notes: string) {
  return `# 📄 ${itemName}
<br></br>
  \`\`\`
${notes}
\`\`\`
`;
}

export default ShowNotesAction;
