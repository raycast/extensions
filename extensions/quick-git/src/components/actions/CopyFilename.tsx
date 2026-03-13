import { Action, Keyboard } from "@raycast/api";

interface Props {
  fileName: string;
}

export function CopyFilename({ fileName }: Props) {
  return <Action.CopyToClipboard title="Copy Filename" content={fileName} shortcut={Keyboard.Shortcut.Common.Copy} />;
}
