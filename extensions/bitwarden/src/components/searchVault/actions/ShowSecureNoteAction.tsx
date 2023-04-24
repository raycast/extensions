import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import { codeBlock } from "~/utils/strings";

function ShowSecureNoteAction() {
  const { notes, name } = useSelectedVaultItem();
  const { push } = useNavigation();

  if (!notes) return null;

  const showSecureNote = () => {
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
  };

  return (
    <ActionWithReprompt
      title="Show Secure Note"
      icon={Icon.BlankDocument}
      onAction={showSecureNote}
      repromptDescription={`Showing the note of <${name}>`}
    />
  );
}

export default ShowSecureNoteAction;
