import { Clipboard, Icon } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { Item, Reprompt } from "~/types/search";

export type CopyUsernameActionProps = {
  item: Item;
};

function CopyUsernameAction(props: CopyUsernameActionProps) {
  const { item } = props;
  const username = item?.login?.username;

  if (!username) return null;

  const copyUsername = async () => Clipboard.copy(username);

  return (
    <ActionWithReprompt
      itemId={item.id}
      title="Copy Username"
      icon={Icon.Person}
      onAction={copyUsername}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      reprompt={item.reprompt === Reprompt.REQUIRED}
      repromptDescription={`Copying the username of <${item.name}>`}
    />
  );
}

export default CopyUsernameAction;
