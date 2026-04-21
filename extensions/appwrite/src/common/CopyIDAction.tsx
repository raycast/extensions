import { Action, Keyboard } from "@raycast/api";

export default function CopyIDAction({ item }: { item: { $id: string } }) {
  return (
    <Action.CopyToClipboard title="Copy ID to Clipboard" content={item.$id} shortcut={Keyboard.Shortcut.Common.Copy} />
  );
}
