import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { exportClipboard } from "./clipboard";
import { GitignoreFile } from "./types";
import fs from "fs/promises";

function toMarkdown(code: string | null) {
  if (code === null) {
    return undefined;
  }
  return "```" + code + "```";
}

export default function GitignorePreview({ gitignoreFile }: { gitignoreFile: GitignoreFile }) {
  const [fileContents, setFileContents] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fs.readFile(gitignoreFile.path, { signal: controller.signal })
      .then((buffer: Buffer) => buffer.toString())
      .then((contents: string) => setFileContents(contents));
    return controller.abort;
  }, [gitignoreFile]);

  return (
    <Detail
      isLoading={fileContents === null}
      navigationTitle={`Gitignore Preview (${gitignoreFile.name})`}
      markdown={toMarkdown(fileContents)}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => exportClipboard([gitignoreFile])} />
        </ActionPanel>
      }
    />
  );
}
