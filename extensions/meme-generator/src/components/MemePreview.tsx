import { Action, ActionPanel, Detail, showHUD } from "@raycast/api";
import { useMemo } from "react";
import copyFileToClipboard from "../lib/copyFileToClipboard";

export default function MemePreview({ title, url }: { title: string; url: string }) {
  const markdown = useMemo(() => `![${title} preview](${url})`, [url]);

  const onCopyAction = async () => {
    await copyFileToClipboard(url, `${title}.jpg`);
    showHUD(`Meme "${title}" copied to clipboard`);
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy to clipboard" onAction={onCopyAction} />
        </ActionPanel>
      }
    />
  );
}
