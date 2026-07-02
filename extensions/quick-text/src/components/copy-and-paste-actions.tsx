import { Action, Keyboard } from "@raycast/api";

export function CopyAndPasteActions({ content }: { content: string | null }) {
  if (!content) return null;
  return (
    <>
      <Action.Paste title="Replace Selection" content={content} />
      <Action.CopyToClipboard
        title="Copy to Clipboard"
        content={content}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    </>
  );
}
