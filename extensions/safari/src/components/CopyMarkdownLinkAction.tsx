import { Action } from "@raycast/api";

export default function CopyMarkdownLinkAction(props: { title?: string; url: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Markdown"
      content={`[${props.title ?? "Untitled"}](${props.url})`}
      shortcut={{ modifiers: ["cmd", "ctrl"], key: "." }}
    />
  );
}
