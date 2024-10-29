import { Action, Icon } from "@raycast/api";

export function CopyToClipboardAction({ title, content }: { title: string; content: string }) {
  return <Action.CopyToClipboard title={`Copy ${title}`} content={content} />;
}

export function ReloadAction({ onReload }: { onReload: () => void }) {
  return <Action title="Reload" icon={Icon.ArrowClockwise} onAction={onReload} />;
}
