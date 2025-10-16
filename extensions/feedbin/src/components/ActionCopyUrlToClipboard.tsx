import { Action } from "@raycast/api";

export interface ActionCopyUrlToClipboardProps {
  url: string;
}

export function ActionCopyUrlToClipboard(props: ActionCopyUrlToClipboardProps) {
  return (
    <Action.CopyToClipboard
      title="Copy URL to Clipboard"
      content={props.url}
      shortcut={{
        key: "c",
        modifiers: ["cmd", "shift"],
      }}
    />
  );
}
