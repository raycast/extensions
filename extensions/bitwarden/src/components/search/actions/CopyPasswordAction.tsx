import { Icon, showHUD } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";
import { Item, Reprompt } from "~/types/search";
import { copyPassword as copyPasswordToClipboard } from "~/utils/clipboard";

export type CopyPasswordActionProps = {
  item: Item;
  title?: string;
};

const getRepromptDescription = (item: Item) => `Copying the password of <${item.name}>`;

/**
 * Raycast {@link Action} for copying a password to the clipboard.
 * This uses the {@link copyPassword} function to prevent clipboard managers from saving it.
 *
 * @param props.title The action title.
 * @param props.item The login item. Used for the prompt form.
 */
const CopyPasswordAction = (props: CopyPasswordActionProps) => {
  const { item, title } = props;
  const password = item?.login?.password;

  if (!password) return null;

  const copyPassword = async () => {
    const { copiedSecurely } = await copyPasswordToClipboard(password);
    await showHUD(copiedSecurely ? "Copied password to clipboard" : "Copied to clipboard");
  };

  return (
    <ActionWithReprompt
      itemId={item.id}
      title={title ?? "Copy Password"}
      icon={Icon.CopyClipboard}
      onAction={copyPassword}
      reprompt={item.reprompt === Reprompt.REQUIRED}
      repromptDescription={getRepromptDescription(item)}
    />
  );
};

export default CopyPasswordAction;
