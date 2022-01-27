import { CopyToClipboardAction } from "@raycast/api";

const CopyMarkdownLinkAction = (props: { title?: string; url: string }) => (
  <CopyToClipboardAction
    title="Copy Markdown"
    content={`[${props.title ?? "Untitled"}](${props.url})`}
    shortcut={{ modifiers: ["cmd", "ctrl"], key: "." }}
  />
);

export default CopyMarkdownLinkAction;
