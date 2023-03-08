import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/search/context/vaultItem";
import { codeBlock } from "~/utils/strings";

function ShowSecureNoteAction() {
  const { notes, name } = useSelectedVaultItem();
  const { push } = useNavigation();

  if (!notes) return null;

  const showSecureNote = async () => {
    push(
      <Detail
        markdown={codeBlock(notes)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Secure Notes" content={notes} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <ActionWithReprompt
      title="Show Secure Note"
      icon={Icon.BlankDocument}
      onAction={showSecureNote}
      repromptDescription={`Showing the secure note of <${name}>`}
    />
  );
}

export default ShowSecureNoteAction;
