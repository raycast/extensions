import { Action, ActionPanel, closeMainWindow, Detail, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import copyFileToClipboard from "../lib/copyFileToClipboard";

export default function MemePreview({ title, url }: { title: string; url: string }) {
  const markdown = useMemo(() => `![${title} preview](${url})`, [url]);

  const onCopyAction = async () => {
    await copyFileToClipboard(url, `${title}.jpg`);
    await closeMainWindow();
    await showToast(Toast.Style.Success, `Meme "${title}" copied to clipboard`);
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" onAction={onCopyAction} />
        </ActionPanel>
      }
    />
  );
}
