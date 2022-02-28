import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { exportClipboard } from "./clipboard";
import { GitignoreFile } from "./types";
import { generateContents } from "./utils";

function toMarkdown(code: string | null) {
  if (code === null) {
    return undefined;
  }
  return "```\n" + code + "\n```";
}

export default function GitignorePreview({ gitignoreFiles }: { gitignoreFiles: GitignoreFile[] }) {
  const [fileContents, setFileContents] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    generateContents(gitignoreFiles, controller.signal).then((contents: string) => setFileContents(contents));
    return controller.abort;
  }, [gitignoreFiles]);

  return (
    <Detail
      isLoading={fileContents === null}
      navigationTitle={`Gitignore Preview`}
      markdown={toMarkdown(fileContents)}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => exportClipboard(gitignoreFiles)} />
        </ActionPanel>
      }
    />
  );
}
