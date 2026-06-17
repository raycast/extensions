import { Action } from "@raycast/api";

const CopyMarkdownLinkAction = (props: { title?: string; url: string }) => (
  <Action.CopyToClipboard
    title="Copy Markdown"
    content={`[${props.title ?? "Untitled"}](${props.url})`}
    shortcut={{ modifiers: ["cmd", "ctrl"], key: "." }}
  />
);

export default CopyMarkdownLinkAction;
