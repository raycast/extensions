import { Action, Icon, showHUD } from "@raycast/api";
import { Item } from "~/types/search";
import { copyPassword } from "~/utils/clipboard";
import useReprompt from "~/utils/hooks/useReprompt";

export type CopyPasswordActionProps = {
  content: string;
  reprompt: boolean;
  title?: string;
  item?: Item;
};

/**
 * Raycast {@link Action} for copying a password to the clipboard.
 * This uses the {@link copyPassword} function to prevent clipboard managers from saving it.
 *
 * @param props.title The action title.
 * @param props.content The password to copy.
 * @param props.reprompt If true, requires the master password to be entered again.
 * @param props.item The login item. Used for the prompt form.
 */
const CopyPasswordAction = (props: CopyPasswordActionProps) => {
  async function doCopy() {
    const { copiedSecurely } = await copyPassword(props.content);
    await showHUD(copiedSecurely ? "Copied password to clipboard" : "Copied to clipboard");
  }

  const reprompt = useReprompt(doCopy, { item: props.item, what: "copy the password" });
  const action = props.reprompt ? reprompt : doCopy;

  return <Action title={props.title ?? "Copy Password"} icon={Icon.CopyClipboard} onAction={action}></Action>;
};

export default CopyPasswordAction;
