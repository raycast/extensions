import { Action, Clipboard, Icon } from "@raycast/api";
import { Session } from "../api/session";
import { Item } from "../types/search";
import useReprompt from "../utils/hooks/useReprompt";

/**
 * Raycast {@link Action} for pasting a password to the foreground application.
 *
 * @param props.title The action title.
 * @param props.content The password to paste.
 * @param props.reprompt If true, requires the master password to be entered again.
 * @param props.item The login item. Used for the prompt form.
 */
export function PastePasswordAction(props: {
  session: Session;
  content: string;
  reprompt: boolean;
  title?: string;
  item?: Item;
}): JSX.Element {
  async function doPaste() {
    Clipboard.paste(props.content);
  }

  const reprompt = useReprompt(props.session, doPaste, { item: props.item, what: "paste the password" });
  const action = props.reprompt ? reprompt : doPaste;

  return <Action title={props.title ?? "Paste Password"} icon={Icon.CopyClipboard} onAction={action}></Action>;
}
