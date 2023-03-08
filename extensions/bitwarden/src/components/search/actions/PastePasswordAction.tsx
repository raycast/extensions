import { Clipboard, Icon } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { Item, Reprompt } from "~/types/search";

export type PastePasswordActionProps = {
  item: Item;
  title?: string;
};

const getRepromptDescription = (item: Item) => `Pasting the password of <${item.name}>`;

/**
 * Raycast {@link Action} for pasting a password to the foreground application.
 *
 * @param props.title The action title.
 * @param props.item The login item. Used for the prompt form.
 */
const PastePasswordAction = (props: PastePasswordActionProps) => {
  const { item, title } = props;
  const password = item?.login?.password;

  if (!password) return null;

  const pastePassword = async () => {
    await Clipboard.paste(password);
  };

  return (
    <ActionWithReprompt
      itemId={item.id}
      title={title ?? "Paste Password"}
      icon={Icon.CopyClipboard}
      onAction={pastePassword}
      reprompt={item.reprompt === Reprompt.REQUIRED}
      repromptDescription={getRepromptDescription(item)}
    />
  );
};

export default PastePasswordAction;
