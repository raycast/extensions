import { Clipboard, Keyboard, Action as RCAction } from "@raycast/api";

type CustomActionProps = {
  content: string;
  type: Preferences["primaryAction"];
  title?: string;
  shortcut?: Keyboard.Shortcut;
};

export default function CustomAction({ type, content, title, shortcut }: CustomActionProps) {
  const props = { content, title, shortcut };

  if (type === "paste") {
    return <RCAction.Paste {...props} />;
  } else if (type === "copy") {
    return <RCAction.CopyToClipboard {...props} />;
  } else if (type === "copy-and-paste") {
    return <RCAction.Paste onPaste={Clipboard.copy} {...props} />;
  }

  return null;
}
