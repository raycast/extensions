import { Action } from "@raycast/api";

const CopyUrlAction = (props: { url: string }) => (
  <Action.CopyToClipboard title="Copy URL" content={props.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
);

export default CopyUrlAction;
