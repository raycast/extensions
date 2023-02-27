import { Action, Clipboard, Icon } from "@raycast/api";
import { Item } from "~/types/search";
import useReprompt from "~/utils/hooks/useReprompt";

export type PastePasswordActionProps = {
  content: string;
  reprompt: boolean;
  title?: string;
  item?: Item;
};

/**
 * Raycast {@link Action} for pasting a password to the foreground application.
 *
 * @param props.title The action title.
 * @param props.content The password to paste.
 * @param props.reprompt If true, requires the master password to be entered again.
 * @param props.item The login item. Used for the prompt form.
 */
const PastePasswordAction = (props: PastePasswordActionProps) => {
  async function doPaste() {
    Clipboard.paste(props.content);
  }

  const reprompt = useReprompt(doPaste, { item: props.item, what: "paste the password" });
  const action = props.reprompt ? reprompt : doPaste;

  return <Action title={props.title ?? "Paste Password"} icon={Icon.CopyClipboard} onAction={action}></Action>;
};

export default PastePasswordAction;
