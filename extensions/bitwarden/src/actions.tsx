import { Action, Clipboard, Icon, popToRoot, showHUD, useNavigation } from "@raycast/api";
import { copyPassword } from "./clipboard";
import { RepromptForm, Session } from "./session";
import { Item } from "./types";
import paste = Clipboard.paste;

/**
 * Returns a function for an {@link Action} that will navigate to a master password confirmation form.
 * If the confirmation is successful, the provided action will be performed.
 *
 * @param session The session instance.
 * @param action The action to perform upon confirmation.
 * @param options Options for the form.
 */
function useReprompt(
  session: Session,
  action: () => void,
  options: {
    item?: Item;
    what?: string;
  }
): () => void {
  const { push, pop } = useNavigation();
  const { item, what } = options ?? {};

  const description = `Confirmation required${action == null ? "" : ` to ${what}`}${
    item == null ? "." : ` for ${item.name}.`
  }`;

  return () => {
    if (session.canRepromptBeSkipped()) {
      action();
      return;
    }

    push(
      <RepromptForm
        session={session}
        description={description}
        onConfirm={() => {
          pop();
          action();
        }}
      />
    );
  };
}

/**
 * Raycast {@link Action} for copying a password to the clipboard.
 * This uses the {@link copyPassword} function to prevent clipboard managers from saving it.
 *
 * @param props.title The action title.
 * @param props.content The password to copy.
 * @param props.reprompt If true, requires the master password to be entered again.
 * @param props.item The login item. Used for the prompt form.
 */
export function CopyPasswordAction(props: {
  session: Session;
  content: string;
  reprompt: boolean;
  title?: string;
  item?: Item;
}): JSX.Element {
  async function doCopy() {
    const { copiedSecurely } = await copyPassword(props.content);
    await showHUD(copiedSecurely ? "Copied password to clipboard" : "Copied to clipboard");
  }

  const reprompt = useReprompt(props.session, doCopy, { item: props.item, what: "copy the password" });
  const action = props.reprompt ? reprompt : doCopy;

  return <Action title={props.title ?? "Copy Password"} icon={Icon.CopyClipboard} onAction={action}></Action>;
}

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
    paste(props.content);
  }

  const reprompt = useReprompt(props.session, doPaste, { item: props.item, what: "paste the password" });
  const action = props.reprompt ? reprompt : doPaste;

  return <Action title={props.title ?? "Paste Password"} icon={Icon.CopyClipboard} onAction={action}></Action>;
}
