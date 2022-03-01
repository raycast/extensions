import { CopyToClipboardAction } from "@raycast/api";

const CopyUrlAction = (props: { url: string }) => (
  <CopyToClipboardAction title="Copy URL" content={props.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
);

export default CopyUrlAction;
