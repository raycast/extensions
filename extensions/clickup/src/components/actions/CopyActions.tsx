import { Action } from "@raycast/api";

import { Shortcuts } from "../../constants/shortcuts";

type CopyToClipboardProps = Pick<Action.CopyToClipboard.Props, "content">;

interface CopyUrlProps {
  url: string;
}

interface CopyIdProps {
  id: string;
}

export function CopyBody({ content }: CopyToClipboardProps) {
  return <Action.CopyToClipboard content={content} shortcut={Shortcuts.CopyMarkdown} title="Copy Body" />;
}

export function CopyMarkdownUrl({ content }: CopyToClipboardProps) {
  return <Action.CopyToClipboard content={content} shortcut={Shortcuts.CopyMarkdownUrl} title="Copy Markdown URL" />;
}

export function CopyUrl({ url }: CopyUrlProps) {
  return <Action.CopyToClipboard content={url} shortcut={Shortcuts.CopyUrl} title="Copy URL" />;
}

export function CopyId({ id }: CopyIdProps) {
  return <Action.CopyToClipboard content={id} shortcut={Shortcuts.CopyId} title="Copy ID" />;
}
