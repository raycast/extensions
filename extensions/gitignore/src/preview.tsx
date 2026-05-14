import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { exportClipboard } from "./clipboard";
import { GitignoreFile } from "./types";
import { generateContents } from "./utils";

function toMarkdown(title: string, code: string | null): string | undefined {
  if (code === null) {
    return undefined;
  }
  return `### ${title}\n\`\`\`\n${code}\n\`\`\``;
}

export default function GitignorePreview({
  gitignoreFiles,
  listPreview,
}: {
  gitignoreFiles: GitignoreFile[];
  listPreview?: boolean;
}) {
  const [fileContents, setFileContents] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    generateContents(gitignoreFiles, controller.signal)
      .then((contents) => setFileContents(contents))
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to generate contents:", err);
          setFileContents("");
        }
      });
    return () => {
      controller.abort();
    };
  }, [gitignoreFiles]);

  const title = gitignoreFiles.map((f) => f.name).join(", ");
  const markdown = toMarkdown(title, fileContents);

  if (listPreview) {
    return <List.Item.Detail isLoading={fileContents === null} markdown={markdown} />;
  }

  return (
    <Detail
      navigationTitle="Gitignore Preview"
      isLoading={fileContents === null}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => exportClipboard(gitignoreFiles)} />
        </ActionPanel>
      }
    />
  );
}
