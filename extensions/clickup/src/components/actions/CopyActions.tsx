import { Action, Icon } from "@raycast/api";
import { Shortcuts } from "../../constants/shortcuts";

export function CopyBody({ content }: Pick<Action.CopyToClipboard.Props, "content">) {
  return (
    <Action.CopyToClipboard
      content={content}
      icon={Icon.Document}
      shortcut={Shortcuts.CopyMarkdown}
      title="Copy Body as Markdown"
    />
  );
}

type CopyToClipboardContent = Action.CopyToClipboard.Props["content"];

export function CopyMarkdownUrl({ url }: { url: CopyToClipboardContent }) {
  return (
    <Action.CopyToClipboard
      content={url}
      icon={Icon.Link}
      shortcut={Shortcuts.CopyMarkdownUrl}
      title="Copy Markdown URL"
    />
  );
}

export function CopyUrl({ url }: { url: CopyToClipboardContent }) {
  return <Action.CopyToClipboard content={url} icon={Icon.Globe} shortcut={Shortcuts.CopyUrl} title="Copy URL" />;
}

export function CopyId({ id }: { id: CopyToClipboardContent }) {
  return <Action.CopyToClipboard content={id} icon={Icon.Key} shortcut={Shortcuts.CopyId} title="Copy ID" />;
}
