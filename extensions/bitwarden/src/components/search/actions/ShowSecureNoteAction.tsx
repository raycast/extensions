import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { Item, Reprompt } from "~/types/search";
import { codeBlock } from "~/utils/strings";

export type ShowSecureNoteActionProps = {
  item: Item;
};

function ShowSecureNoteAction(props: ShowSecureNoteActionProps) {
  const { item } = props;
  const { push } = useNavigation();

  const secureNote = item?.notes;

  if (!secureNote) return null;

  const showSecureNote = async () => {
    push(
      <Detail
        markdown={codeBlock(secureNote)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Secure Notes" content={secureNote} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <ActionWithReprompt
      itemId={item.id}
      title="Show Secure Note"
      icon={Icon.BlankDocument}
      onAction={showSecureNote}
      reprompt={item.reprompt === Reprompt.REQUIRED}
      repromptDescription={`Showing the secure note of <${item.name}>`}
    />
  );
}

export default ShowSecureNoteAction;
