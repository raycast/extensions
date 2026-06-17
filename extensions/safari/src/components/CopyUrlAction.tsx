import { Action } from "@raycast/api";

export default function CopyUrlAction(props: { url: string }) {
  return <Action.CopyToClipboard title="Copy URL" content={props.url} shortcut={{ modifiers: ["cmd"], key: "." }} />;
}
