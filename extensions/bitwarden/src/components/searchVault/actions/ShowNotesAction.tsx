import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { showCopySuccessMessage } from "~/utils/clipboard";
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
      if (notes) push(<DetailsScreen itemName={selectedItem.name} notes={notes} />);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get notes");
      captureException("Failed to show notes", error);
    }
  };

  return (
    <ActionWithReprompt
      title="Show Notes"
      icon={Icon.Eye}
      onAction={showNotes}
      repromptDescription={`Showing the notes of <${selectedItem.name}>`}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

function DetailsScreen({ itemName, notes }: { itemName: string; notes: string }) {
  const handleCopy = async () => {
    await Clipboard.copy(notes, { transient: getTransientCopyPreference("other") });
    await showCopySuccessMessage("Copied notes to clipboard");
  };

  return (
    <Detail
      markdown={getNotesDetailsMarkdown(itemName, notes)}
      actions={
        <ActionPanel>
          <Action title="Copy Notes" onAction={handleCopy} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}

function getNotesDetailsMarkdown(itemName: string, notes: string) {
  return `# 📄 ${itemName}
&nbsp;
\`\`\`
${notes}
\`\`\`
`;
}

export default ShowNotesAction;
