import { Action, Clipboard, Icon, showHUD } from "@raycast/api";
import { Item } from "~/types/vault";
import useReprompt from "~/utils/hooks/useReprompt";
import { getTransientCopyPreference } from "~/utils/preferences";

export type CopyPasswordActionProps = {
  content: string;
  reprompt: boolean;
  title?: string;
  item?: Item;
};

/**
 * Raycast {@link Action} for copying a password to the clipboard.
 *
 * @param props.title The action title.
 * @param props.content The password to copy.
 * @param props.reprompt If true, requires the master password to be entered again.
 * @param props.item The login item. Used for the prompt form.
 */
const CopyPasswordAction = (props: CopyPasswordActionProps) => {
  async function doCopy() {
    await Clipboard.copy(props.content, { transient: getTransientCopyPreference("password") });
    await showHUD("Copied password to clipboard");
  }

  const reprompt = useReprompt(doCopy, { item: props.item, what: "copy the password" });
  const action = props.reprompt ? reprompt : doCopy;

  return <Action title={props.title ?? "Copy Password"} icon={Icon.CopyClipboard} onAction={action}></Action>;
};

export default CopyPasswordAction;
