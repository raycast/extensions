import { Clipboard, Keyboard, Action as RCAction } from "@raycast/api";
import { ActionType } from "../models/actionType";

type CustomActionProps = {
  content: string;
  type: ActionType;
  title?: string;
  shortcut?: Keyboard.Shortcut;
};

export default function CustomAction({ type, content, title, shortcut }: CustomActionProps) {
  const props = { content, title, shortcut };

  if (type === ActionType.PASTE) {
    return <RCAction.Paste {...props} />;
  } else if (type === ActionType.COPY) {
    return <RCAction.CopyToClipboard {...props} />;
  } else if (type === ActionType.COPY_AND_PASTE) {
    return <RCAction.Paste onPaste={Clipboard.copy} {...props} />;
  }

  return null;
}
